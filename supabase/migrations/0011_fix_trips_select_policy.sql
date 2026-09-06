-- Fixes a real-world RLS bug: `insert into trips ... returning *` (which the
-- client issues via `.insert().select()`) is, since Postgres 15, ALSO checked
-- against the table's SELECT policy for the returned row. The original SELECT
-- policy only allowed rows visible via `is_trip_member(id)`, which depends on
-- the `on_trip_created` AFTER INSERT trigger having already inserted the
-- owner's trip_members row — a side effect that is not guaranteed to be
-- visible to the RETURNING projection of the same statement. Confirmed via
-- direct testing: the insert succeeds without RETURNING and fails with it.
--
-- Fix: let the owner read their own trip directly via owner_id, independent
-- of the trip_members trigger's timing. This is also just correct on its own
-- merits — an owner should always be able to see a trip they created.
drop policy "trips: members can read" on public.trips;

create policy "trips: members can read"
  on public.trips for select
  to authenticated
  using (public.is_trip_member(id) or owner_id = auth.uid());
