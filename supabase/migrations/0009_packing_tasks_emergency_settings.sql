-- =========================================================================
-- packing_items
-- =========================================================================
create table public.packing_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  group_name text not null check (
    group_name in (
      'outerwear', 'warm_layers', 'footwear', 'car_essentials', 'electronics',
      'health_toiletries', 'documents_money', 'aurora_outdoor', 'other'
    )
  ),
  name text not null,
  quantity int not null default 1 check (quantity >= 0),
  owner_id uuid references public.profiles (id) on delete set null,
  packed boolean not null default false,
  priority text not null default 'recommended' check (priority in ('essential', 'recommended', 'optional')),
  notes text,
  buy_before_trip boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

create index packing_items_trip_idx on public.packing_items (trip_id, group_name);

create trigger packing_items_set_audit
  before insert or update on public.packing_items
  for each row execute function public.set_audit_fields();

alter table public.packing_items enable row level security;

create policy "packing_items: members can read"
  on public.packing_items for select
  to authenticated
  using (public.is_trip_member(trip_id));

create policy "packing_items: members can write"
  on public.packing_items for all
  to authenticated
  using (public.is_trip_member(trip_id))
  with check (public.is_trip_member(trip_id));

-- =========================================================================
-- tasks (pre-trip checklist)
-- =========================================================================
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  group_name text not null check (
    group_name in (
      'documents_insurance', 'esim_data', 'currency_cards', 'car_prep', 'booking_confirmations',
      'home_prep', 'health_medication', 'safetravel', 'offline_maps_emergency', 'other'
    )
  ),
  title text not null,
  due_date date,
  assignee_id uuid references public.profiles (id) on delete set null,
  completed boolean not null default false,
  reminder_preference text not null default 'none' check (reminder_preference in ('none', '1_day', '3_days', '1_week')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

create index tasks_trip_idx on public.tasks (trip_id, completed, due_date);

create trigger tasks_set_audit
  before insert or update on public.tasks
  for each row execute function public.set_audit_fields();

alter table public.tasks enable row level security;

create policy "tasks: members can read"
  on public.tasks for select
  to authenticated
  using (public.is_trip_member(trip_id));

create policy "tasks: members can write"
  on public.tasks for all
  to authenticated
  using (public.is_trip_member(trip_id))
  with check (public.is_trip_member(trip_id));

-- =========================================================================
-- emergency_contacts
-- =========================================================================
create table public.emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  category text not null check (
    category in ('emergency_services', 'health', 'embassy', 'insurance', 'roadside_assistance', 'family', 'other')
  ),
  country text,
  name text not null,
  phone text,
  whatsapp_phone text,
  email text,
  address text,
  notes text,
  needs_verification boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

create index emergency_contacts_trip_idx on public.emergency_contacts (trip_id, category);

create trigger emergency_contacts_set_audit
  before insert or update on public.emergency_contacts
  for each row execute function public.set_audit_fields();

alter table public.emergency_contacts enable row level security;

create policy "emergency_contacts: members can read"
  on public.emergency_contacts for select
  to authenticated
  using (public.is_trip_member(trip_id));

create policy "emergency_contacts: members can write"
  on public.emergency_contacts for all
  to authenticated
  using (public.is_trip_member(trip_id))
  with check (public.is_trip_member(trip_id));

-- =========================================================================
-- app_settings (one row per trip: vault salt, manual FX rates, prefs)
-- =========================================================================
create table public.app_settings (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null unique references public.trips (id) on delete cascade,
  vault_salt text,
  vault_check_ciphertext text,
  vault_check_iv text,
  exchange_rates jsonb not null default '{"ISK": 1, "INR": 0.53, "EUR": 0.0067, "GBP": 0.0058, "USD": 0.0072}'::jsonb,
  exchange_rates_updated_at timestamptz,
  default_currency text not null default 'ISK' check (default_currency in ('ISK', 'INR', 'EUR', 'GBP', 'USD')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

create trigger app_settings_set_audit
  before insert or update on public.app_settings
  for each row execute function public.set_audit_fields();

alter table public.app_settings enable row level security;

create policy "app_settings: members can read"
  on public.app_settings for select
  to authenticated
  using (public.is_trip_member(trip_id));

create policy "app_settings: members can write"
  on public.app_settings for all
  to authenticated
  using (public.is_trip_member(trip_id))
  with check (public.is_trip_member(trip_id));

-- Auto-create a default settings row whenever a trip is created.
create or replace function public.handle_new_trip_settings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.app_settings (trip_id) values (new.id)
  on conflict (trip_id) do nothing;
  return new;
end;
$$;

create trigger on_trip_created_settings
  after insert on public.trips
  for each row execute function public.handle_new_trip_settings();
