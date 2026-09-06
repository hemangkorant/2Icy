-- =========================================================================
-- expenses
-- =========================================================================
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  day_id uuid references public.itinerary_days (id) on delete set null,
  category text not null check (
    category in ('food', 'activities', 'fuel', 'accommodation', 'transport', 'souvenirs', 'groceries', 'other')
  ),
  expense_date date not null default current_date,
  amount numeric not null check (amount >= 0),
  currency text not null default 'ISK' check (currency in ('ISK', 'INR', 'EUR', 'GBP', 'USD')),
  converted_amount numeric,
  converted_currency text default 'INR' check (converted_currency in ('ISK', 'INR', 'EUR', 'GBP', 'USD', null)),
  exchange_rate numeric,
  payer_id uuid references public.profiles (id),
  split_method text not null default 'equal' check (split_method in ('equal', 'custom', 'none')),
  receipt_document_id uuid references public.documents (id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

create index expenses_trip_idx on public.expenses (trip_id, expense_date);
create index expenses_category_idx on public.expenses (trip_id, category);

create trigger expenses_set_audit
  before insert or update on public.expenses
  for each row execute function public.set_audit_fields();

alter table public.expenses enable row level security;

create policy "expenses: members can read"
  on public.expenses for select
  to authenticated
  using (public.is_trip_member(trip_id));

create policy "expenses: members can write"
  on public.expenses for all
  to authenticated
  using (public.is_trip_member(trip_id))
  with check (public.is_trip_member(trip_id));

-- =========================================================================
-- expense_splits (custom % / amount per person for a given expense)
-- =========================================================================
create table public.expense_splits (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  share_percent numeric check (share_percent >= 0 and share_percent <= 100),
  share_amount numeric check (share_amount >= 0),
  created_at timestamptz not null default now(),
  unique (expense_id, user_id)
);

create index expense_splits_expense_idx on public.expense_splits (expense_id);

alter table public.expense_splits enable row level security;

create policy "expense_splits: members can read"
  on public.expense_splits for select
  to authenticated
  using (
    exists (
      select 1 from public.expenses e
      where e.id = expense_splits.expense_id and public.is_trip_member(e.trip_id)
    )
  );

create policy "expense_splits: members can write"
  on public.expense_splits for all
  to authenticated
  using (
    exists (
      select 1 from public.expenses e
      where e.id = expense_splits.expense_id and public.is_trip_member(e.trip_id)
    )
  )
  with check (
    exists (
      select 1 from public.expenses e
      where e.id = expense_splits.expense_id and public.is_trip_member(e.trip_id)
    )
  );
