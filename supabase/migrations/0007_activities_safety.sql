-- =========================================================================
-- activities (booked tours / experiences)
-- =========================================================================
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  day_id uuid references public.itinerary_days (id) on delete set null,
  name text not null,
  provider text,
  activity_date date,
  start_time time,
  end_time time,
  duration_minutes int,
  meeting_point text,
  lat double precision,
  lng double precision,
  booking_reference text,
  price numeric,
  currency text not null default 'ISK',
  participants text,
  what_to_bring text,
  cancellation_policy text,
  contact_details text,
  booking_link text,
  reminder_status text not null default 'pending' check (reminder_status in ('pending', 'confirmed', 'checked_in')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

create index activities_trip_idx on public.activities (trip_id, activity_date);
create index activities_day_idx on public.activities (day_id);

create trigger activities_set_audit
  before insert or update on public.activities
  for each row execute function public.set_audit_fields();

alter table public.activities enable row level security;

create policy "activities: members can read"
  on public.activities for select
  to authenticated
  using (public.is_trip_member(trip_id));

create policy "activities: members can write"
  on public.activities for all
  to authenticated
  using (public.is_trip_member(trip_id))
  with check (public.is_trip_member(trip_id));

-- =========================================================================
-- safety_checks (manual weather/road/safetravel/aurora/alert entries)
-- =========================================================================
create table public.safety_checks (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  day_id uuid references public.itinerary_days (id) on delete cascade,
  check_type text not null check (check_type in ('weather', 'road', 'safetravel', 'aurora', 'alert')),
  checked_at timestamptz not null default now(),
  checked_by uuid references public.profiles (id),
  source_url text,
  assessment text,
  severity text not null default 'low' check (severity in ('low', 'medium', 'high')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

create index safety_checks_trip_idx on public.safety_checks (trip_id, check_type, checked_at desc);
create index safety_checks_day_idx on public.safety_checks (day_id, check_type);

create trigger safety_checks_set_audit
  before insert or update on public.safety_checks
  for each row execute function public.set_audit_fields();

alter table public.safety_checks enable row level security;

create policy "safety_checks: members can read"
  on public.safety_checks for select
  to authenticated
  using (public.is_trip_member(trip_id));

create policy "safety_checks: members can write"
  on public.safety_checks for all
  to authenticated
  using (public.is_trip_member(trip_id))
  with check (public.is_trip_member(trip_id));
