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
  'Iceland Ring Road',
  '2026-10-10',
  '2026-10-25',
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

-- Bookings transcribed from the supplied flight, accommodation, and rental PDFs.
insert into public.flights (
  id, trip_id, airline, flight_number, departure_airport, arrival_airport,
  departure_at, arrival_at, booking_reference, baggage_allowance, terminal, status, notes
) values
  ('40000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'Lufthansa', 'LH757', 'BOM', 'FRA',
   '2026-10-10 02:40:00+05:30', '2026-10-10 08:05:00+02:00', 'YCWXKB',
   '1 checked bag up to 23 kg; 1 carry-on up to 8 kg', '2', 'scheduled', 'Economy Flex (V); operated by Lufthansa.'),
  ('40000000-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', 'Lufthansa', 'LH844', 'FRA', 'KEF',
   '2026-10-10 11:10:00+02:00', '2026-10-10 12:55:00+00:00', 'YCWXKB',
   '1 checked bag up to 23 kg; 1 carry-on up to 8 kg', '1', 'scheduled', 'Economy Flex (V); operated by Lufthansa.'),
  ('40000000-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333', 'Lufthansa', 'LH847', 'KEF', 'FRA',
   '2026-10-24 00:25:00+00:00', '2026-10-24 05:55:00+02:00', 'YCWXKB',
   '1 checked bag up to 23 kg; 1 carry-on up to 8 kg', null, 'scheduled', 'Economy Flex (Q); operated by Lufthansa.'),
  ('40000000-0000-0000-0000-000000000004', '33333333-3333-3333-3333-333333333333', 'Lufthansa', 'LH756', 'FRA', 'BOM',
   '2026-10-24 13:00:00+02:00', '2026-10-25 01:00:00+05:30', 'YCWXKB',
   '1 checked bag up to 23 kg; 1 carry-on up to 8 kg', '1', 'scheduled', 'Economy Flex (Q); operated by Lufthansa.')
on conflict (id) do nothing;

insert into public.accommodations (
  id, trip_id, name, check_in_date, check_out_date, check_in_time, check_out_time,
  address, lat, lng, confirmation_number, contact_name, contact_phone, booking_source,
  parking_notes, cancellation_policy, notes
) values
  ('41000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'Blue Viking Studios', '2026-10-10', '2026-10-11', '16:00', '11:00',
   'Grófin 8, 230 Keflavík, Iceland', 64.009267, -22.561800, '5274.730.819', null, '+354 421 5555', 'Booking.com',
   'Free private parking on site.', 'Free cancellation until 2026-10-07 23:59; non-refundable from 2026-10-08.', 'Double or twin room with private bathroom. Approx. EUR 178.05; approximate INR total ₹19,886. No meal included. Expected arrival 16:00–17:00.'),
  ('41000000-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', 'Skógafoss dairy farm stay - Eyjafjallajökull view', '2026-10-11', '2026-10-13', '15:00', '12:00',
   'Hvolsvöllur, Iceland', null, null, 'HM4TAPQXHR', 'Þórarinn', '+354 774 2241', 'Airbnb',
   null, null, 'Amount paid ₹26,786.38. Two guests.'),
  ('41000000-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333', 'Skyrhusid Guesthouse', '2026-10-13', '2026-10-14', '17:00', '10:00',
   'Hali, 781 Hali, Iceland', 64.129267, -16.016133, '6400.697.187', null, '+354 899 8384', 'Booking.com',
   'Free private parking on site.', 'Free cancellation until 2026-10-07 23:59; non-refundable from 2026-10-08.', 'Double or twin room with shared bathroom. Approx. ISK 26,389; approximate INR total ₹20,269. No meal included.'),
  ('41000000-0000-0000-0000-000000000004', '33333333-3333-3333-3333-333333333333', 'Seljavellir Guesthouse', '2026-10-14', '2026-10-15', '16:30', '11:00',
   'Seljavellir, 781 Höfn, Iceland', 64.305083, -15.207117, '6344.329.276', null, '+354 539 5093', 'Booking.com',
   'Free public parking on site.', 'Free cancellation until 2026-10-06 23:59; non-refundable from 2026-10-07.', 'Double room with mountain view. Approx. EUR 138.60; approximate INR total ₹15,267. No meal included.'),
  ('41000000-0000-0000-0000-000000000005', '33333333-3333-3333-3333-333333333333', 'Skipalaekur Guesthouse', '2026-10-15', '2026-10-16', '16:00', '11:00',
   'Skipalaekur, 700 Egilsstadir, Iceland', 65.280633, -14.434700, '6707.800.092', null, '+354 471 1324', 'Booking.com',
   'Free private parking on site.', 'Free cancellation until 2026-10-13 23:59; non-refundable from 2026-10-14.', 'Double or twin room. Approx. EUR 155.86; approximate INR total ₹17,168. No meal included. Breakfast is served 700 m away during summer.'),
  ('41000000-0000-0000-0000-000000000006', '33333333-3333-3333-3333-333333333333', 'Skútustadir Guesthouse', '2026-10-16', '2026-10-17', '14:00', '11:00',
   'Skútustadir 2B, 660 Myvatn, Iceland', 65.567167, -17.039433, '5416.590.313', null, '+354 464 4212', 'Booking.com',
   'Free private parking on site.', 'Free cancellation until 2026-10-14 23:59; non-refundable from 2026-10-15.', 'Twin room with private bathroom. Approx. EUR 175.98; approximate INR total ₹19,384. Breakfast included.'),
  ('41000000-0000-0000-0000-000000000007', '33333333-3333-3333-3333-333333333333', 'G19 Boutique Apartments', '2026-10-17', '2026-10-18', '16:00', '11:00',
   '19 Gránufélagsgata, 600 Akureyri, Iceland', 65.684917, -18.089733, '6230.692.782', null, '+354 776 4874', 'Booking.com',
   'Free private parking on site.', 'Free cancellation until 2026-10-14 23:59; non-refundable from 2026-10-15.', 'Basement apartment with kitchenette. Approx. EUR 162.78; approximate INR total ₹17,930. No meal included. License HG-00003421.'),
  ('41000000-0000-0000-0000-000000000008', '33333333-3333-3333-3333-333333333333', 'Frost Guesthouse', '2026-10-18', '2026-10-19', '16:00', '11:00',
   'Staðarflöt, 531 Hvammstangi, Iceland', 65.142750, -21.058667, '5081.499.759', null, '+354 899 4860', 'Booking.com',
   'Free private parking on site. No internet access.', 'Free cancellation until 2026-10-16 23:59; non-refundable from 2026-10-17.', 'Twin room with mountain view. Approx. EUR 136.85; approximate INR total ₹15,074. No meal included.'),
  ('41000000-0000-0000-0000-000000000009', '33333333-3333-3333-3333-333333333333', 'Adventure Hotel Hellissandur', '2026-10-19', '2026-10-20', '16:00', '11:00',
   'Klettsbúð, 360 Hellissandur, Iceland', 64.915500, -23.881433, '6959.019.130', null, '+354 770 3666', 'Booking.com',
   'Free private parking on site.', 'Free cancellation until 3 days before arrival; non-refundable within 3 days of arrival.', 'Double or twin room with private bathroom. Approx. EUR 141.41; approximate INR total ₹15,576. Breakfast included. EUR 280 damage deposit required on arrival and refundable after inspection.'),
  ('41000000-0000-0000-0000-000000000010', '33333333-3333-3333-3333-333333333333', 'Hotel Hafnarfjall', '2026-10-20', '2026-10-21', '15:00', '11:00',
   'Hafnarskógur, 311 Borgarnes, Iceland', 64.518033, -21.892450, '5059.021.220', null, '+354 437 2345', 'Booking.com',
   'Free private parking on site.', 'Free cancellation until 3 days before arrival; non-refundable within 3 days of arrival.', 'Standard double/twin room. Approx. EUR 148.81; approximate INR total ₹16,391. No meal included. Notify hotel if arriving after 21:00.'),
  ('41000000-0000-0000-0000-000000000011', '33333333-3333-3333-3333-333333333333', 'A quiet place in the center of Selfoss', '2026-10-21', '2026-10-22', '15:00', '12:00',
   'Hlaðvellir 8, Selfoss, Sveitarfélagið Árborg 800, Iceland', null, null, 'HM4ZWF5KP9', 'Jon', '+354 695 4969', 'Airbnb',
   null, null, 'Amount paid ₹14,378.37. Two guests.'),
  ('41000000-0000-0000-0000-000000000012', '33333333-3333-3333-3333-333333333333', 'Downtown Reykjavík Apartments', '2026-10-22', '2026-10-24', '15:00', '11:00',
   'Raudararstigur 31, 105 Reykjavík, Iceland', 64.141000, -21.913583, '5595.189.176', null, '+354 445 6777', 'Booking.com',
   'Free private parking on site.', 'Free cancellation until 2026-10-14 23:59; non-refundable from 2026-10-15.', 'Standard studio with kitchenette. 2 nights. EUR 292 total; approximate INR total ₹32,163. Full prepayment; 24-hour self-check-in and door code sent before arrival.')
on conflict (id) do nothing;

insert into public.rental_cars (
  id, trip_id, rental_company, car_model, pickup_location, pickup_at,
  dropoff_location, dropoff_at, confirmation_number, fuel_type, insurance_level,
  emergency_contact, return_instructions, notes
) values (
  '42000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'GO Car Rental', 'Dacia Duster (Older Model)',
  'Keflavík Intl. Airport (KEF)', '2026-10-10 14:30:00+00:00',
  'Keflavík Intl. Airport (KEF)', '2026-10-23 20:00:00+00:00', 'WM2OWY', 'petrol', 'Platinum',
  null, 'Return to Keflavík Intl. Airport by 20:00 on October 23, 2026.',
  '2 passengers. Flight reference LH844; stated rental arrival time 14:30. Self-service: No. 4G WiFi: EUR 0. Road tax: EUR 10.50/day x 14 days = EUR 147. Rental EUR 724 + insurance EUR 560 + road tax EUR 147 - 11% discount EUR 87 = EUR 1,344 paid in full. Extra driver: Rutu Maganbhai Gadhethariya. Fuel type not stated in booking; petrol is a planning assumption and should be verified at pickup.'
) on conflict (id) do nothing;

insert into public.vehicle_checklists (rental_car_id, stage, label, position)
select '42000000-0000-0000-0000-000000000001', checklist.stage, checklist.label,
  row_number() over (partition by checklist.stage order by checklist.label) - 1
from (values
  ('before_pickup', 'Photograph all existing damage'),
  ('before_pickup', 'Confirm fuel level and fuel type'),
  ('before_pickup', 'Confirm rental paperwork and insurance'),
  ('during_trip', 'Check tire and windshield condition'),
  ('before_return', 'Refuel to agreed level'),
  ('before_return', 'Photograph final mileage and fuel level'),
  ('before_return', 'Photograph returned vehicle and damage condition'),
  ('before_return', 'Return keys and collect deposit confirmation')
) as checklist(stage, label)
on conflict do nothing;

insert into public.emergency_contacts (trip_id, category, country, name, phone, notes, needs_verification) values
  ('33333333-3333-3333-3333-333333333333', 'emergency_services', 'Iceland', 'Iceland Emergency (112)', '112', 'Police, fire, ambulance, search & rescue.', false),
  ('33333333-3333-3333-3333-333333333333', 'health', 'Iceland', 'Icelandic Health Info Line', '+354 513 1700', 'Non-emergency medical advice line.', false),
  ('33333333-3333-3333-3333-333333333333', 'embassy', 'India', 'Embassy of India, Oslo (covers Iceland)', null, 'VERIFY BEFORE TRAVEL: confirm current number/address via mea.gov.in before departure.', true)
on conflict do nothing;
