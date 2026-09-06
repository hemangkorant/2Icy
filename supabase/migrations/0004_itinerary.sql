-- =========================================================================
-- itinerary_days
-- =========================================================================
create table public.itinerary_days (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  date date not null,
  sort_order int not null default 0,
  title text,
  overnight_location text,
  overnight_lat double precision,
  overnight_lng double precision,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

create index itinerary_days_trip_idx on public.itinerary_days (trip_id, sort_order);

create trigger itinerary_days_set_audit
  before insert or update on public.itinerary_days
  for each row execute function public.set_audit_fields();

alter table public.itinerary_days enable row level security;

create policy "itinerary_days: members can read"
  on public.itinerary_days for select
  to authenticated
  using (public.is_trip_member(trip_id));

create policy "itinerary_days: members can write"
  on public.itinerary_days for all
  to authenticated
  using (public.is_trip_member(trip_id))
  with check (public.is_trip_member(trip_id));

-- =========================================================================
-- itinerary_stops
-- =========================================================================
create table public.itinerary_stops (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.itinerary_days (id) on delete cascade,
  position int not null default 0,
  name text not null,
  address text,
  lat double precision,
  lng double precision,
  planned_arrival time,
  planned_departure time,
  activity_notes text,
  booking_link text,
  status text not null default 'planned',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

create index itinerary_stops_day_idx on public.itinerary_stops (day_id, position);

create trigger itinerary_stops_set_audit
  before insert or update on public.itinerary_stops
  for each row execute function public.set_audit_fields();

alter table public.itinerary_stops enable row level security;

create policy "itinerary_stops: members can read"
  on public.itinerary_stops for select
  to authenticated
  using (
    exists (
      select 1 from public.itinerary_days d
      where d.id = itinerary_stops.day_id and public.is_trip_member(d.trip_id)
    )
  );

create policy "itinerary_stops: members can write"
  on public.itinerary_stops for all
  to authenticated
  using (
    exists (
      select 1 from public.itinerary_days d
      where d.id = itinerary_stops.day_id and public.is_trip_member(d.trip_id)
    )
  )
  with check (
    exists (
      select 1 from public.itinerary_days d
      where d.id = itinerary_stops.day_id and public.is_trip_member(d.trip_id)
    )
  );

-- =========================================================================
-- driving_segments (between two consecutive stops on the same day)
-- =========================================================================
create table public.driving_segments (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.itinerary_days (id) on delete cascade,
  from_stop_id uuid not null references public.itinerary_stops (id) on delete cascade,
  to_stop_id uuid not null references public.itinerary_stops (id) on delete cascade,
  distance_km numeric,
  duration_minutes int,
  google_maps_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id),
  constraint driving_segments_distinct_stops check (from_stop_id <> to_stop_id)
);

create index driving_segments_day_idx on public.driving_segments (day_id);
create unique index driving_segments_pair_unique on public.driving_segments (from_stop_id, to_stop_id);

create trigger driving_segments_set_audit
  before insert or update on public.driving_segments
  for each row execute function public.set_audit_fields();

alter table public.driving_segments enable row level security;

create policy "driving_segments: members can read"
  on public.driving_segments for select
  to authenticated
  using (
    exists (
      select 1 from public.itinerary_days d
      where d.id = driving_segments.day_id and public.is_trip_member(d.trip_id)
    )
  );

create policy "driving_segments: members can write"
  on public.driving_segments for all
  to authenticated
  using (
    exists (
      select 1 from public.itinerary_days d
      where d.id = driving_segments.day_id and public.is_trip_member(d.trip_id)
    )
  )
  with check (
    exists (
      select 1 from public.itinerary_days d
      where d.id = driving_segments.day_id and public.is_trip_member(d.trip_id)
    )
  );
