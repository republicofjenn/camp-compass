-- Extends kids_select_own so a guardian can see a kid's name (and, as a
-- side effect, birth month/year) when that kid's camp schedule has been
-- explicitly shared with them via an accepted connection -- otherwise
-- there'd be no way to display "Lily is registered for X camp" to the
-- connected family, since the original policy only allowed a kid's own
-- guardians to see anything about them at all.
--
-- can_view_kid_schedule already encodes exactly the right condition (own
-- kid, OR accepted connection + explicit share) since it was built for the
-- session_enrollments visibility check -- reusing it here keeps "can see
-- this kid's name" and "can see this kid's schedule" consistent, which is
-- the right invariant: you can't meaningfully show one without the other.

drop policy if exists "kids_select_own" on kids;

create policy "kids_select_own" on kids
  for select using (can_view_kid_schedule(auth.uid(), id));
