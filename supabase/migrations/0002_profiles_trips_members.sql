-- =========================================================================
-- Tables (created first; functions/triggers/policies reference them below)
-- =========================================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'One row per authenticated user, mirrors auth.users.';

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date,
  end_date date,
  timezone text not null default 'Atlantic/Reykjavik',
  owner_id uuid not null references public.profiles (id) on delete restrict,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

create table public.trip_members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade,
  invited_email text,
  role text not null default 'editor' check (role in ('owner', 'editor')),
  status text not null default 'active' check (status in ('invited', 'active')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trip_members_user_or_invite check (user_id is not null or invited_email is not null)
);

create unique index trip_members_trip_user_unique
  on public.trip_members (trip_id, user_id)
  where user_id is not null;

create unique index trip_members_trip_invite_unique
  on public.trip_members (trip_id, invited_email)
  where invited_email is not null and user_id is null;

create index trip_members_user_idx on public.trip_members (user_id);

-- =========================================================================
-- Functions
-- =========================================================================

-- Lighter audit trigger for tables without an updated_by column (e.g. profiles).
create or replace function public.set_audit_fields_no_updated_by()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := coalesce(new.created_at, now());
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- Auto-create a profile row whenever a new auth user signs up (magic link).
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Membership helpers, SECURITY DEFINER so policies on trip_members itself
-- don't recurse into RLS when evaluating these functions.
create or replace function public.is_trip_member(_trip_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.trip_members
    where trip_id = _trip_id and user_id = auth.uid() and status = 'active'
  );
$$;

create or replace function public.is_trip_owner(_trip_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.trip_members
    where trip_id = _trip_id and user_id = auth.uid() and role = 'owner' and status = 'active'
  );
$$;

comment on function public.is_trip_member(uuid) is
  'SECURITY DEFINER: safe to call from any RLS policy without recursive-policy errors.';

-- When a trip is created, automatically add the creator as its owner member.
create or replace function public.handle_new_trip()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.trip_members (trip_id, user_id, role, status)
  values (new.id, new.owner_id, 'owner', 'active');
  return new;
end;
$$;

-- =========================================================================
-- Triggers
-- =========================================================================

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

create trigger profiles_set_audit
  before insert or update on public.profiles
  for each row execute function public.set_audit_fields_no_updated_by();

create trigger trips_set_audit
  before insert or update on public.trips
  for each row execute function public.set_audit_fields();

create trigger trip_members_set_audit
  before insert or update on public.trip_members
  for each row execute function public.set_audit_fields_no_updated_by();

create trigger on_trip_created
  after insert on public.trips
  for each row execute function public.handle_new_trip();

-- =========================================================================
-- RLS: profiles
-- =========================================================================
alter table public.profiles enable row level security;

create policy "profiles: read own or co-member profiles"
  on public.profiles for select
  to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.trip_members tm1
      join public.trip_members tm2 on tm1.trip_id = tm2.trip_id
      where tm1.user_id = auth.uid() and tm2.user_id = public.profiles.id
    )
  );

create policy "profiles: update own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- =========================================================================
-- RLS: trips
-- =========================================================================
alter table public.trips enable row level security;

create policy "trips: members can read"
  on public.trips for select
  to authenticated
  using (public.is_trip_member(id));

create policy "trips: authenticated users can create a trip"
  on public.trips for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "trips: owner can update"
  on public.trips for update
  to authenticated
  using (public.is_trip_owner(id))
  with check (public.is_trip_owner(id));

create policy "trips: owner can delete"
  on public.trips for delete
  to authenticated
  using (public.is_trip_owner(id));

-- =========================================================================
-- RLS: trip_members
-- =========================================================================
alter table public.trip_members enable row level security;

create policy "trip_members: members can read the roster"
  on public.trip_members for select
  to authenticated
  using (public.is_trip_member(trip_id));

create policy "trip_members: owner can invite/add"
  on public.trip_members for insert
  to authenticated
  with check (public.is_trip_owner(trip_id));

create policy "trip_members: owner can update roles"
  on public.trip_members for update
  to authenticated
  using (public.is_trip_owner(trip_id))
  with check (public.is_trip_owner(trip_id));

create policy "trip_members: owner can remove, or a member can leave"
  on public.trip_members for delete
  to authenticated
  using (public.is_trip_owner(trip_id) or user_id = auth.uid());
