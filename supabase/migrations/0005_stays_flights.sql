-- =========================================================================
-- accommodations
-- =========================================================================
create table public.accommodations (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  name text not null,
  check_in_date date,
  check_out_date date,
  check_in_time time,
  check_out_time time,
  address text,
  lat double precision,
  lng double precision,
  confirmation_number text,
  contact_name text,
  contact_phone text,
  contact_email text,
  website text,
  booking_source text,
  parking_notes text,
  cancellation_policy text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

create index accommodations_trip_idx on public.accommodations (trip_id, check_in_date);

create trigger accommodations_set_audit
  before insert or update on public.accommodations
  for each row execute function public.set_audit_fields();

alter table public.accommodations enable row level security;

create policy "accommodations: members can read"
  on public.accommodations for select
  to authenticated
  using (public.is_trip_member(trip_id));

create policy "accommodations: members can write"
  on public.accommodations for all
  to authenticated
  using (public.is_trip_member(trip_id))
  with check (public.is_trip_member(trip_id));

-- =========================================================================
-- flights
-- =========================================================================
create table public.flights (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  airline text,
  flight_number text,
  departure_airport text,
  arrival_airport text,
  departure_at timestamptz,
  arrival_at timestamptz,
  booking_reference text,
  seats text,
  baggage_allowance text,
  terminal text,
  gate text,
  status text not null default 'scheduled' check (status in ('scheduled', 'delayed', 'cancelled', 'completed')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

create index flights_trip_idx on public.flights (trip_id, departure_at);

create trigger flights_set_audit
  before insert or update on public.flights
  for each row execute function public.set_audit_fields();

alter table public.flights enable row level security;

create policy "flights: members can read"
  on public.flights for select
  to authenticated
  using (public.is_trip_member(trip_id));

create policy "flights: members can write"
  on public.flights for all
  to authenticated
  using (public.is_trip_member(trip_id))
  with check (public.is_trip_member(trip_id));
