-- =========================================================================
-- documents: encrypted vault metadata. The actual file bytes live in the
-- 'trip-documents' Storage bucket under an opaque path (trip_id/uuid), with
-- ciphertext only — see src/lib/crypto.ts. Nothing meaningful (real
-- filename, title) is stored in the clear; encrypted_title/iv hold an
-- AES-GCM-encrypted JSON blob that the client decrypts with the trip's
-- vault key, which is derived from a passphrase never stored server-side.
-- =========================================================================
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  category text not null check (
    category in (
      'passport', 'travel_insurance', 'flight_confirmation', 'accommodation_confirmation',
      'car_rental_confirmation', 'tour_voucher', 'driving_licence', 'other'
    )
  ),
  linked_entity_type text check (
    linked_entity_type in ('accommodation', 'flight', 'rental_car', 'activity', 'expense', null)
  ),
  linked_entity_id uuid,
  storage_path text not null unique,
  encrypted_metadata text not null,
  metadata_iv text not null,
  file_iv text not null,
  size_bytes bigint not null default 0,
  owner_id uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

create index documents_trip_idx on public.documents (trip_id);
create index documents_linked_entity_idx on public.documents (linked_entity_type, linked_entity_id);

create trigger documents_set_audit
  before insert or update on public.documents
  for each row execute function public.set_audit_fields();

alter table public.documents enable row level security;

create policy "documents: members can read metadata"
  on public.documents for select
  to authenticated
  using (public.is_trip_member(trip_id));

create policy "documents: members can upload"
  on public.documents for insert
  to authenticated
  with check (public.is_trip_member(trip_id) and owner_id = auth.uid());

create policy "documents: members can update metadata"
  on public.documents for update
  to authenticated
  using (public.is_trip_member(trip_id))
  with check (public.is_trip_member(trip_id));

create policy "documents: members can delete"
  on public.documents for delete
  to authenticated
  using (public.is_trip_member(trip_id));

-- =========================================================================
-- Storage: trip-documents bucket. Private (not public). Object paths are
-- "<trip_id>/<opaque-uuid>" so RLS can check trip membership from the path.
-- =========================================================================
insert into storage.buckets (id, name, public)
values ('trip-documents', 'trip-documents', false)
on conflict (id) do nothing;

create policy "trip-documents: members can read files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'trip-documents'
    and public.is_trip_member(((storage.foldername(name))[1])::uuid)
  );

create policy "trip-documents: members can upload files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'trip-documents'
    and public.is_trip_member(((storage.foldername(name))[1])::uuid)
  );

create policy "trip-documents: members can delete files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'trip-documents'
    and public.is_trip_member(((storage.foldername(name))[1])::uuid)
  );
