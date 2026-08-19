-- Row-Level Security policies enforcing the privacy model at the database
-- layer, not just in application code. Run this AFTER drizzle-kit has
-- created the tables (drizzle-kit does not manage RLS itself).
--
-- Core rules encoded here:
--   1. A guardian can only ever read/write their own row -- home_lat/lng and
--      budget are NEVER exposed to any other guardian, connected or not.
--   2. A guardian can read/write a kid only if linked via guardian_kids.
--   3. A guardian can see another household's kid's session_enrollments only
--      if: there is an ACCEPTED family_connections row between the two
--      households, AND that kid's own guardian has explicitly set
--      connection_kid_shares.shared = true for that connection. Both
--      conditions are required -- no one-way visibility, ever.
--   4. Camp/session/interest data is public read (not sensitive, needs to be
--      browsable to signed-out visitors and all signed-in guardians alike).

alter table guardians enable row level security;
alter table kids enable row level security;
alter table guardian_kids enable row level security;
alter table interests enable row level security;
alter table kid_interests enable row level security;
alter table camps enable row level security;
alter table camp_interests enable row level security;
alter table sessions enable row level security;
alter table session_enrollments enable row level security;
alter table family_connections enable row level security;
alter table connection_kid_shares enable row level security;

-- ---------------------------------------------------------------------
-- guardians: strictly self-only. No policy ever allows reading another
-- guardian's row, regardless of connection status.
-- ---------------------------------------------------------------------
create policy "guardians_select_self" on guardians
  for select using (id = auth.uid());

create policy "guardians_update_self" on guardians
  for update using (id = auth.uid());

create policy "guardians_insert_self" on guardians
  for insert with check (id = auth.uid());

-- ---------------------------------------------------------------------
-- helper: is this guardian linked to this kid via guardian_kids?
-- ---------------------------------------------------------------------
create or replace function is_kid_guardian(p_guardian_id uuid, p_kid_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from guardian_kids
    where guardian_id = p_guardian_id and kid_id = p_kid_id
  );
$$;

-- ---------------------------------------------------------------------
-- helper: can p_viewer_id see p_kid_id's camp plans via an accepted,
-- explicitly-shared family connection?
-- ---------------------------------------------------------------------
create or replace function can_view_kid_schedule(p_viewer_id uuid, p_kid_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select is_kid_guardian(p_viewer_id, p_kid_id)
  or exists (
    select 1
    from connection_kid_shares cks
    join family_connections fc on fc.id = cks.connection_id
    where cks.kid_id = p_kid_id
      and cks.shared = true
      and fc.status = 'accepted'
      and (fc.guardian_a_id = p_viewer_id or fc.guardian_b_id = p_viewer_id)
  );
$$;

-- ---------------------------------------------------------------------
-- kids: readable/writable only by linked guardians
-- ---------------------------------------------------------------------
create policy "kids_select_own" on kids
  for select using (is_kid_guardian(auth.uid(), id));

create policy "kids_update_own" on kids
  for update using (is_kid_guardian(auth.uid(), id));

-- ---------------------------------------------------------------------
-- guardian_kids: a guardian can see/manage links for themself only
-- ---------------------------------------------------------------------
create policy "guardian_kids_select_own" on guardian_kids
  for select using (guardian_id = auth.uid());

create policy "guardian_kids_insert_own" on guardian_kids
  for insert with check (guardian_id = auth.uid());

create policy "guardian_kids_delete_own" on guardian_kids
  for delete using (guardian_id = auth.uid());

-- ---------------------------------------------------------------------
-- kid_interests: same guardian-linkage rule as kids
-- ---------------------------------------------------------------------
create policy "kid_interests_select_own" on kid_interests
  for select using (is_kid_guardian(auth.uid(), kid_id));

create policy "kid_interests_insert_own" on kid_interests
  for insert with check (is_kid_guardian(auth.uid(), kid_id));

create policy "kid_interests_delete_own" on kid_interests
  for delete using (is_kid_guardian(auth.uid(), kid_id));

-- ---------------------------------------------------------------------
-- public read: interests, camps, camp_interests, sessions --
-- non-sensitive, browsable by anyone (including signed-out visitors).
-- ---------------------------------------------------------------------
create policy "interests_public_read" on interests for select using (true);
create policy "camps_public_read" on camps for select using (true);
create policy "camp_interests_public_read" on camp_interests for select using (true);
create policy "sessions_public_read" on sessions for select using (true);

-- ---------------------------------------------------------------------
-- session_enrollments: own kids always visible; other households' kids
-- visible only through can_view_kid_schedule (accepted connection +
-- explicit per-kid share).
-- ---------------------------------------------------------------------
create policy "session_enrollments_select" on session_enrollments
  for select using (can_view_kid_schedule(auth.uid(), kid_id));

create policy "session_enrollments_insert_own" on session_enrollments
  for insert with check (is_kid_guardian(auth.uid(), kid_id));

create policy "session_enrollments_update_own" on session_enrollments
  for update using (is_kid_guardian(auth.uid(), kid_id));

create policy "session_enrollments_delete_own" on session_enrollments
  for delete using (is_kid_guardian(auth.uid(), kid_id));

-- ---------------------------------------------------------------------
-- family_connections: visible to either side of the connection; only the
-- requester can insert (with themself as the requester); either side can
-- update status (to accept/decline).
-- ---------------------------------------------------------------------
create policy "family_connections_select" on family_connections
  for select using (guardian_a_id = auth.uid() or guardian_b_id = auth.uid());

create policy "family_connections_insert" on family_connections
  for insert with check (
    requested_by_guardian_id = auth.uid()
    and (guardian_a_id = auth.uid() or guardian_b_id = auth.uid())
  );

create policy "family_connections_update" on family_connections
  for update using (guardian_a_id = auth.uid() or guardian_b_id = auth.uid());

-- ---------------------------------------------------------------------
-- connection_kid_shares: a guardian may only set the "shared" checkbox for
-- their OWN kid -- never toggle sharing on behalf of the other household's
-- kid. Visible to both sides once the connection exists so each can see
-- what's currently shared.
-- ---------------------------------------------------------------------
create policy "connection_kid_shares_select" on connection_kid_shares
  for select using (
    exists (
      select 1 from family_connections fc
      where fc.id = connection_id
        and (fc.guardian_a_id = auth.uid() or fc.guardian_b_id = auth.uid())
    )
  );

create policy "connection_kid_shares_upsert_own_kid" on connection_kid_shares
  for insert with check (is_kid_guardian(auth.uid(), kid_id));

create policy "connection_kid_shares_update_own_kid" on connection_kid_shares
  for update using (is_kid_guardian(auth.uid(), kid_id));
