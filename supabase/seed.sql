-- =========================================================================
-- LOCAL DEVELOPMENT SEED DATA ONLY.
--
-- This file is only ever executed by `supabase db reset` / `supabase start`
-- against your LOCAL Supabase instance. It is NOT run by `supabase db push`
-- and is never applied to a linked/production project. Do not insert
-- documents or real secrets here, and do not run this file's contents
-- manually against a hosted database.
-- =========================================================================

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
) values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated', 'authenticated', 'demo.owner@example.test', '',
  now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Demo Owner"}'
) on conflict (id) do nothing;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
) values (
  '00000000-0000-0000-0000-000000000000',
  '22222222-2222-2222-2222-222222222222',
  'authenticated', 'authenticated', 'demo.partner@example.test', '',
  now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Demo Partner"}'
) on conflict (id) do nothing;

-- profiles rows are normally created by the on_auth_user_created trigger;
-- inserted here too in case triggers are disabled during a raw seed run.
insert into public.profiles (id, email, full_name) values
  ('11111111-1111-1111-1111-111111111111', 'demo.owner@example.test', 'Demo Owner'),
  ('22222222-2222-2222-2222-222222222222', 'demo.partner@example.test', 'Demo Partner')
on conflict (id) do nothing;

insert into public.trips (id, name, start_date, end_date, owner_id, is_demo) values (
  '33333333-3333-3333-3333-333333333333',
  'Iceland Ring Road (Demo)',
  '2026-10-09',
  '2026-10-23',
  '11111111-1111-1111-1111-111111111111',
  true
) on conflict (id) do nothing;

insert into public.trip_members (trip_id, user_id, role, status) values
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'owner', 'active'),
  ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'editor', 'active')
on conflict do nothing;

insert into public.itinerary_days (trip_id, date, sort_order, title, overnight_location, overnight_lat, overnight_lng) values
  ('33333333-3333-3333-3333-333333333333', '2026-10-09', 0, 'Arrival in Keflavik', 'Reykjavik', 64.1466, -21.9426),
  ('33333333-3333-3333-3333-333333333333', '2026-10-10', 1, 'Golden Circle', 'Selfoss', 63.9333, -21.0000),
  ('33333333-3333-3333-3333-333333333333', '2026-10-11', 2, 'South Coast waterfalls', 'Vik', 63.4186, -19.0060)
on conflict do nothing;

insert into public.emergency_contacts (trip_id, category, country, name, phone, notes, needs_verification) values
  ('33333333-3333-3333-3333-333333333333', 'emergency_services', 'Iceland', 'Iceland Emergency (112)', '112', 'Police, fire, ambulance, search & rescue.', false),
  ('33333333-3333-3333-3333-333333333333', 'health', 'Iceland', 'Icelandic Health Info Line', '+354 513 1700', 'Non-emergency medical advice line.', false),
  ('33333333-3333-3333-3333-333333333333', 'embassy', 'India', 'Embassy of India, Oslo (covers Iceland)', null, 'VERIFY BEFORE TRAVEL: confirm current number/address via mea.gov.in before departure.', true)
on conflict do nothing;
