-- Replace the single itinerary_day_id link with a multi-day array so a stay
-- spanning several nights can be linked to every night it covers.
alter table public.accommodations
  add column itinerary_day_ids uuid[] not null default '{}';

update public.accommodations
set itinerary_day_ids = array[itinerary_day_id]
where itinerary_day_id is not null;

drop index if exists accommodations_itinerary_day_idx;
alter table public.accommodations drop column itinerary_day_id;

create index accommodations_itinerary_day_ids_idx on public.accommodations using gin (itinerary_day_ids);
