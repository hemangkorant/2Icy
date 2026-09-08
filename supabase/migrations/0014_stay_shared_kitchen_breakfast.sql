-- Add "shared kitchen" as a cooking-facility option, and a breakfast-included flag.
alter table public.accommodations
  drop constraint accommodations_cooking_facility_check;

alter table public.accommodations
  add constraint accommodations_cooking_facility_check
  check (cooking_facility in ('kitchen', 'shared_kitchen', 'pantry', 'none'));

alter table public.accommodations
  add column breakfast_included boolean;
