-- Fixes Supabase security advisor WARNings (2026-08-23 scan).
--
-- Context: every SECURITY DEFINER function in the public schema is
-- automatically callable via Supabase's auto-generated REST RPC endpoint
-- (/rest/v1/rpc/<function_name>), by anon and/or authenticated depending on
-- grants. Some of ours had no business being callable that way at all.

-- ---------------------------------------------------------------------
-- 1. Real fix: is_kid_guardian/can_view_kid_schedule took an arbitrary
--    p_guardian_id/p_viewer_id argument. Called directly via RPC with
--    someone else's guardian id, they'd answer "is guardian X linked to
--    kid Y" for ANY X and Y -- an oracle that leaks guardian_kids
--    relationships despite that table's own RLS being locked down. Every
--    actual call site in this codebase (see 0001, 0005) always passes
--    auth.uid() for that argument anyway, so drop it as a parameter
--    entirely and read auth.uid() internally. The function can now only
--    ever answer about the CURRENT caller, never an arbitrary guardian.
--
--    Policies referencing the old two-argument signatures have to be
--    dropped first (can't change a function signature out from under a
--    dependent policy), then recreated against the new one-argument form.
-- ---------------------------------------------------------------------
drop policy if exists "kids_select_own" on kids; -- currently uses can_view_kid_schedule per 0005
drop policy if exists "kids_update_own" on kids;
drop policy if exists "kid_interests_select_own" on kid_interests;
drop policy if exists "kid_interests_insert_own" on kid_interests;
drop policy if exists "kid_interests_delete_own" on kid_interests;
drop policy if exists "session_enrollments_select" on session_enrollments;
drop policy if exists "session_enrollments_insert_own" on session_enrollments;
drop policy if exists "session_enrollments_update_own" on session_enrollments;
drop policy if exists "session_enrollments_delete_own" on session_enrollments;
drop policy if exists "connection_kid_shares_upsert_own_kid" on connection_kid_shares;
drop policy if exists "connection_kid_shares_update_own_kid" on connection_kid_shares;

drop function if exists public.can_view_kid_schedule(uuid, uuid);
drop function if exists public.is_kid_guardian(uuid, uuid);

create or replace function public.is_kid_guardian(p_kid_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from guardian_kids
    where guardian_id = auth.uid() and kid_id = p_kid_id
  );
$$;

create or replace function public.can_view_kid_schedule(p_kid_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select is_kid_guardian(p_kid_id)
  or exists (
    select 1
    from connection_kid_shares cks
    join family_connections fc on fc.id = cks.connection_id
    where cks.kid_id = p_kid_id
      and cks.shared = true
      and fc.status = 'accepted'
      and (fc.guardian_a_id = auth.uid() or fc.guardian_b_id = auth.uid())
  );
$$;

create policy "kids_select_own" on kids
  for select using (can_view_kid_schedule(id));

create policy "kids_update_own" on kids
  for update using (is_kid_guardian(id));

create policy "kid_interests_select_own" on kid_interests
  for select using (is_kid_guardian(kid_id));

create policy "kid_interests_insert_own" on kid_interests
  for insert with check (is_kid_guardian(kid_id));

create policy "kid_interests_delete_own" on kid_interests
  for delete using (is_kid_guardian(kid_id));

create policy "session_enrollments_select" on session_enrollments
  for select using (can_view_kid_schedule(kid_id));

create policy "session_enrollments_insert_own" on session_enrollments
  for insert with check (is_kid_guardian(kid_id));

create policy "session_enrollments_update_own" on session_enrollments
  for update using (is_kid_guardian(kid_id));

create policy "session_enrollments_delete_own" on session_enrollments
  for delete using (is_kid_guardian(kid_id));

create policy "connection_kid_shares_upsert_own_kid" on connection_kid_shares
  for insert with check (is_kid_guardian(kid_id));

create policy "connection_kid_shares_update_own_kid" on connection_kid_shares
  for update using (is_kid_guardian(kid_id));

-- ---------------------------------------------------------------------
-- 2. Lock down direct RPC access. Note: newly created functions grant
--    EXECUTE to PUBLIC by default, which anon and authenticated both
--    inherit -- revoking FROM anon/authenticated directly does nothing
--    while that PUBLIC grant stands. Have to revoke FROM public first,
--    then grant back explicitly to whichever role should keep access.
-- ---------------------------------------------------------------------

-- Trigger-only (fires on auth.users insert via Supabase's own internal
-- auth service, which doesn't go through anon/authenticated grants at
-- all) -- no client-facing role has any legitimate reason to call this
-- directly, so no grant-back.
revoke execute on function public.handle_new_guardian() from public;

-- Signed-in guardians only -- these three have real uses from our app
-- code (or, for is_kid_guardian/can_view_kid_schedule, from RLS policies
-- evaluated on their behalf), but anon has no legitimate call path to any
-- of them, and now that the two helpers only ever answer about the
-- CURRENT caller, calling them directly is harmless for authenticated
-- users anyway.
revoke execute on function public.find_guardian_by_email(text) from public;
grant execute on function public.find_guardian_by_email(text) to authenticated;

revoke execute on function public.get_my_connections() from public;
grant execute on function public.get_my_connections() to authenticated;

revoke execute on function public.is_kid_guardian(uuid) from public;
grant execute on function public.is_kid_guardian(uuid) to authenticated;

revoke execute on function public.can_view_kid_schedule(uuid) from public;
grant execute on function public.can_view_kid_schedule(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 3. NOT changed here, and why: kids_insert_authenticated's
--    `with check (true)` (0003_kids_insert_policy.sql) is flagged as
--    "RLS Policy Always True", but it's deliberate -- a kid row has no
--    direct guardian_id column (linkage is via guardian_kids), so there's
--    no ownership check possible at insert time; the row is inert and
--    unreadable by anyone until guardian_kids links it (see
--    guardian_kids_insert_own, which DOES check guardian_id = auth.uid()).
--    Weakening this would break kid creation. Reviewed and accepted.
--
--    auth_leaked_password_protection (HaveIBeenPwned check on
--    signup/password change) is a dashboard toggle, not something fixable
--    via SQL -- Authentication > Policies in the Supabase dashboard. Per
--    the dashboard's own Auth settings page, this may be Pro-plan-only;
--    verify there before assuming it's available on the current plan.
-- ---------------------------------------------------------------------
