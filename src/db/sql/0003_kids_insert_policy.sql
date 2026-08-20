-- Missing from 0001: kids had select/update policies but no insert policy,
-- which under RLS means insert was silently denied for everyone. A kid row
-- has no direct guardian_id column (linkage is via guardian_kids), so we
-- can't restrict insert by ownership the same way -- any authenticated
-- guardian may create a kid row; it only becomes visible/usable to them
-- once linked via guardian_kids (which DOES check guardian_id = auth.uid()
-- on insert, see guardian_kids_insert_own in 0001).

create policy "kids_insert_authenticated" on kids
  for insert to authenticated
  with check (true);
