-- =========================================================================
-- profiles: first/last name + gender (for initials avatar + personalization)
-- =========================================================================
alter table public.profiles
  add column first_name text,
  add column last_name text,
  add column gender text check (gender in ('female', 'male', 'other', 'prefer_not_to_say'));

-- =========================================================================
-- accommodations: link to an itinerary day + richer stay details
-- =========================================================================
alter table public.accommodations
  add column itinerary_day_id uuid references public.itinerary_days (id) on delete set null,
  add column town text,
  add column room_type text,
  add column bathroom_type text check (bathroom_type in ('private', 'shared')),
  add column cooking_facility text check (cooking_facility in ('kitchen', 'pantry', 'none')),
  add column has_parking boolean,
  add column cancellation_deadline timestamptz;

create index accommodations_itinerary_day_idx on public.accommodations (itinerary_day_id);
