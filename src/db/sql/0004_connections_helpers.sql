-- Support for the mutual-consent family connection feature.

-- ---------------------------------------------------------------------
-- Tighten family_connections_update: the ORIGINAL 0001 policy let either
-- party update a connection's status, which technically allowed the
-- requester to accept their own request -- defeating mutual consent. This
-- replaces it with a WITH CHECK that blocks exactly that: the requester may
-- still cancel their own pending request (set status to 'declined'), but
-- may not set it to 'accepted' themselves. Only the other party can accept.
-- ---------------------------------------------------------------------
drop policy if exists "family_connections_update" on family_connections;

create policy "family_connections_update" on family_connections
  for update using (guardian_a_id = auth.uid() or guardian_b_id = auth.uid())
  with check (
    (guardian_a_id = auth.uid() or guardian_b_id = auth.uid())
    and not (requested_by_guardian_id = auth.uid() and status = 'accepted')
  );

-- ---------------------------------------------------------------------
-- find_guardian_by_email: the ONLY way to look up another guardian, since
-- guardians otherwise has no RLS policy allowing that (self-select only).
-- Deliberately minimal: exact email match only (no partial/fuzzy search,
-- to prevent scraping the user base), returns id + name only -- never
-- home_lat/lng, budget, or anything else.
-- ---------------------------------------------------------------------
create or replace function find_guardian_by_email(p_email text)
returns table (id uuid, name text)
language sql
stable
security definer
set search_path = public
as $$
  select id, name from guardians where email = p_email;
$$;

-- ---------------------------------------------------------------------
-- get_my_connections: connections table doesn't otherwise expose the OTHER
-- guardian's name (guardians RLS is self-select-only), so this returns each
-- of the caller's connections joined with the partner's name specifically --
-- nothing else about the partner (not their email, home location, budget).
-- ---------------------------------------------------------------------
create or replace function get_my_connections()
returns table (
  connection_id uuid,
  partner_guardian_id uuid,
  partner_name text,
  requested_by_guardian_id uuid,
  status connection_status,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    fc.id,
    case when fc.guardian_a_id = auth.uid() then fc.guardian_b_id else fc.guardian_a_id end,
    case when fc.guardian_a_id = auth.uid() then gb.name else ga.name end,
    fc.requested_by_guardian_id,
    fc.status,
    fc.created_at
  from family_connections fc
  join guardians ga on ga.id = fc.guardian_a_id
  join guardians gb on gb.id = fc.guardian_b_id
  where fc.guardian_a_id = auth.uid() or fc.guardian_b_id = auth.uid()
  order by fc.created_at desc;
$$;
