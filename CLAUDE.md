# Roamio

A shared trip-planning and on-the-ground tracker, built as a generic platform reusable for any destination. This instance currently tracks Hemang and his wife's Iceland road trip.

## Trip context

- Destination: Iceland (Ring Road style trip)
- Dates: Mid-October 2026, ~14 days
- Travelers: Hemang + wife
- Season notes that shape the feature set:
  - Daylight shrinks fast in October (~roughly 10am–6:30pm by mid-month) — daily driving/activity windows are tight
  - Shoulder season: F-roads/highlands start closing, weather and road conditions can change quickly, storms can shut the Ring Road
  - Aurora viewing season starts around this time
  - 4x4 rental and winter driving awareness matters

## Product goal

One tool both travelers can open (ideally from their phones, including in Iceland) to view and edit the same trip data — some sections edited jointly, some more personal (e.g. individual packing lists) — with everything updated live as plans change, before and during the trip.

## Finalized feature set (v1)

1. **Day-by-day plan** — location per day, driving distance/time between stops, planned activities, map view pinning each stop
2. **Daylight window per day** — sunrise/sunset so daily plans respect actual light
3. **Accommodation** — dates, location, address, confirmation #, check-in/out times, contact info
4. **Flight details** — mostly fixed once entered, rarely edited
5. **Rental car details** — car model, insurance level, pickup/dropoff details, fuel type, a fuel-pump/gas-station tracker for remote stretches, a fuel-fill log, and nudges/checklists for pre-rental and return-time car checks (damage photos, fuel level, paperwork)
6. **Booked activities/tours** — times, cancellation policies; addable/editable by either traveler as bookings are made
7. **Conditions panel** — quick access to weather (vedur.is), road conditions (road.is), and a SafeTravel.is trip-registration reminder
8. **Aurora forecast tracker**
9. **Currency converter + expense tracker** — categories: food, activities, fuel, souvenirs/shopping, etc.
10. **Document vault** — passports, travel insurance, booking confirmations
11. **Packing list** — tuned for shoulder-season cold/wind/rain
12. **Pre-trip checklist** — eSIM, insurance, currency, and similar prep tasks
13. **Shared + individual view** — both travelers can manage the tracker together, and also independently (e.g. own packing list, own tasks)
14. **Emergency contacts** — Iceland (112, embassy, etc.) and India (embassy, family)

## Known constraint: live external data

Items 7 and 8 (weather/road conditions, aurora forecast) want "live" data from vedur.is, road.is, safetravel.is. Scraping/automating those sites was explicitly ruled out (against their purpose, and stale automated safety data is worse than none). The Safety & Weather page instead gives one-click links to the real official sources plus a manual "reviewed at [time]" log per day/type — see `src/features/safety/`.

## Build approach (superseded — now built)

The Artifact-based approach considered early on was superseded once the brief was expanded into a production-grade requirement (real auth, Postgres + RLS, encrypted document storage, PWA, CI, Cloudflare deployment). This is now a real full-stack app: React + Vite + TypeScript, Tailwind, Radix/shadcn-style UI, Supabase (Auth/Postgres/Storage/Realtime), MapLibre + OpenFreeMap, Web Crypto for the document vault, Zod, Vitest, deployed to Cloudflare Pages. See [README.md](README.md) for setup and deployment, and `supabase/migrations/` for the schema and RLS policies.

## Status

All 14 features built: itinerary (with drag-drop stops, driving segments, daylight, map, print view), stays, flights, rental car + fuel tracking, activities, safety/weather log, expenses (manual FX + CSV export), encrypted document vault, packing list, pre-trip tasks, emergency contacts, shared trip membership with realtime sync, and a dashboard. Typecheck, lint, and the Vitest suite are all clean; production build succeeds. Not yet deployed or run against a live Supabase project — that's the next step (see README "Local development" and "Deploying to Cloudflare Pages").
