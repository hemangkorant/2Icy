-- =========================================================================
-- rental_cars
-- =========================================================================
create table public.rental_cars (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  rental_company text,
  car_model text,
  registration_number text,
  pickup_location text,
  pickup_address text,
  pickup_at timestamptz,
  dropoff_location text,
  dropoff_address text,
  dropoff_at timestamptz,
  confirmation_number text,
  fuel_type text check (fuel_type in ('petrol', 'diesel', 'electric', 'hybrid', null)),
  insurance_level text,
  insurance_exclusions text,
  emergency_contact text,
  mileage_pickup int,
  mileage_return int,
  return_instructions text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

create index rental_cars_trip_idx on public.rental_cars (trip_id);

create trigger rental_cars_set_audit
  before insert or update on public.rental_cars
  for each row execute function public.set_audit_fields();

alter table public.rental_cars enable row level security;

create policy "rental_cars: members can read"
  on public.rental_cars for select
  to authenticated
  using (public.is_trip_member(trip_id));

create policy "rental_cars: members can write"
  on public.rental_cars for all
  to authenticated
  using (public.is_trip_member(trip_id))
  with check (public.is_trip_member(trip_id));

-- =========================================================================
-- vehicle_checklists (before_pickup / during_trip / before_return items)
-- =========================================================================
create table public.vehicle_checklists (
  id uuid primary key default gen_random_uuid(),
  rental_car_id uuid not null references public.rental_cars (id) on delete cascade,
  stage text not null check (stage in ('before_pickup', 'during_trip', 'before_return')),
  label text not null,
  is_checked boolean not null default false,
  notes text,
  photo_document_id uuid references public.documents (id) on delete set null,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

create index vehicle_checklists_car_idx on public.vehicle_checklists (rental_car_id, stage, position);

create trigger vehicle_checklists_set_audit
  before insert or update on public.vehicle_checklists
  for each row execute function public.set_audit_fields();

alter table public.vehicle_checklists enable row level security;

create policy "vehicle_checklists: members can read"
  on public.vehicle_checklists for select
  to authenticated
  using (
    exists (
      select 1 from public.rental_cars c
      where c.id = vehicle_checklists.rental_car_id and public.is_trip_member(c.trip_id)
    )
  );

create policy "vehicle_checklists: members can write"
  on public.vehicle_checklists for all
  to authenticated
  using (
    exists (
      select 1 from public.rental_cars c
      where c.id = vehicle_checklists.rental_car_id and public.is_trip_member(c.trip_id)
    )
  )
  with check (
    exists (
      select 1 from public.rental_cars c
      where c.id = vehicle_checklists.rental_car_id and public.is_trip_member(c.trip_id)
    )
  );

-- =========================================================================
-- fuel_entries
-- =========================================================================
create table public.fuel_entries (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  rental_car_id uuid references public.rental_cars (id) on delete set null,
  station_name text,
  lat double precision,
  lng double precision,
  filled_at timestamptz not null default now(),
  price_per_liter numeric,
  amount_paid numeric,
  liters numeric,
  odometer int,
  receipt_document_id uuid references public.documents (id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

create index fuel_entries_trip_idx on public.fuel_entries (trip_id, filled_at);

create trigger fuel_entries_set_audit
  before insert or update on public.fuel_entries
  for each row execute function public.set_audit_fields();

alter table public.fuel_entries enable row level security;

create policy "fuel_entries: members can read"
  on public.fuel_entries for select
  to authenticated
  using (public.is_trip_member(trip_id));

create policy "fuel_entries: members can write"
  on public.fuel_entries for all
  to authenticated
  using (public.is_trip_member(trip_id))
  with check (public.is_trip_member(trip_id));

-- =========================================================================
-- Suggested fuel stops manually curated onto itinerary days
-- =========================================================================
create table public.suggested_fuel_stops (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.itinerary_days (id) on delete cascade,
  name text not null,
  lat double precision,
  lng double precision,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

create index suggested_fuel_stops_day_idx on public.suggested_fuel_stops (day_id);

create trigger suggested_fuel_stops_set_audit
  before insert or update on public.suggested_fuel_stops
  for each row execute function public.set_audit_fields();

alter table public.suggested_fuel_stops enable row level security;

create policy "suggested_fuel_stops: members can read"
  on public.suggested_fuel_stops for select
  to authenticated
  using (
    exists (
      select 1 from public.itinerary_days d
      where d.id = suggested_fuel_stops.day_id and public.is_trip_member(d.trip_id)
    )
  );

create policy "suggested_fuel_stops: members can write"
  on public.suggested_fuel_stops for all
  to authenticated
  using (
    exists (
      select 1 from public.itinerary_days d
      where d.id = suggested_fuel_stops.day_id and public.is_trip_member(d.trip_id)
    )
  )
  with check (
    exists (
      select 1 from public.itinerary_days d
      where d.id = suggested_fuel_stops.day_id and public.is_trip_member(d.trip_id)
    )
  );
