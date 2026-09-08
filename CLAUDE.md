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

## Product feel

- premium
- intelligent
- mildly quirky and witty language
- editorial
- highly polished
- effortless

## Feature set

1. **Day-by-day plan** — location per day, driving distance/time between stops, planned activities, map view pinning each stop
2. **Daylight window per day** — sunrise/sunset so daily plans respect actual light
3. **Accommodation** — dates, location, address, confirmation #, check-in/out times, contact info
4. **Flight details** — mostly fixed once entered, rarely edited
5. **Rental car details** — car model, insurance level, pickup/dropoff details, fuel type, a fuel-pump/gas-station tracker for remote stretches, a fuel-fill log, and nudges/checklists for pre-rental and return-time car checks (damage photos, fuel level, paperwork)
6. **Booked activities/tours** — times, cancellation policies; addable/editable by either traveler as bookings are made
7. **Conditions panel** — quick access to weather (vedur.is), road conditions (road.is), and a SafeTravel.is trip-registration reminder
8. **Aurora tracker** — official-source links plus a manual review log (see "Live external data" below)
9. **Currency converter + expense tracker** — categories: food, activities, fuel, souvenirs/shopping, etc.
10. **Document vault** — passports, travel insurance, booking confirmations
11. **Packing list** — tuned for shoulder-season cold/wind/rain
12. **Pre-trip checklist** — eSIM, insurance, currency, and similar prep tasks
13. **Shared + individual view** — both travelers can manage the tracker together, and also independently (e.g. own packing list, own tasks)
14. **Emergency contacts** — Iceland (112, embassy, etc.) and India (embassy, family)
15. **Translator** (added post-v1) — EN↔IS text, voice, and camera/OCR translation for signs, menus, and road notices

---

# Decisions log

Why things are the way they are. Read this before changing any of it — most of these were deliberate, and several were reversals of a first attempt.

## Platform & branding

- **Renamed to "Roamio"** (from "Iceland Trip Tracker" / "2Icy"). The app is a generic trip planner that happens to be running an Iceland trip; the branding should not have to change when the destination does. User-facing surfaces renamed: tab title, PWA manifest, login page, sidebar logo, top-bar fallback, `package.json`, README.
- **Iceland-specific *content* was deliberately NOT generalized** — packing defaults, safety links, emergency contacts, and the `Atlantic/Reykjavik` trip timezone are still Iceland-shaped. Making those destination-driven is a separate, larger piece of work; the rename was branding only.
- **Not renamed, on purpose:** the repo/folder name (`2Icy`) and internal storage key prefixes (`iceland-trip:active-trip-id`, `2icy:stayFormDraft`). These are functional identifiers — renaming them breaks existing signed-in sessions and in-flight drafts for zero user benefit.
- The **top bar shows the trip's own name** ("Iceland Ring Road"), not the product name. "Roamio" only appears there as a fallback before a trip exists. This is intended — on-trip, the trip matters more than the brand.

## Build approach

- The early **Artifact-based approach was superseded** once the brief became production-grade (real auth, Postgres + RLS, encrypted document storage, PWA, CI, deployment). This is a real full-stack app: React 19 + Vite + TypeScript, Tailwind v4, Radix/shadcn-style UI, Supabase (Auth/Postgres/Storage/Realtime), MapLibre + OpenFreeMap, Web Crypto, Zod, Vitest, Cloudflare Pages.
- **No paid APIs anywhere, and no Claude/Anthropic API at runtime.** This is a hard constraint, not a preference — every external dependency below was chosen to honor it, accepting a quality hit where necessary:

  | Need | Choice | Tradeoff accepted |
  | --- | --- | --- |
  | Maps | MapLibre GL + OpenFreeMap | No Mapbox token, no usage billing |
  | Geocoding | OSM Nominatim (`src/lib/geocoding.ts`) | Capped ~1 req/s by usage policy |
  | Translation | MyMemory free API (`src/lib/translate.ts`) | Rate-limited; Icelandic quality rougher than a paid engine |
  | OCR | Tesseract.js, client-side (`src/lib/ocr.ts`) | First run downloads a multi-MB language file; slower than a cloud Vision API |
  | Speech in/out | Web Speech API (`src/lib/speech.ts`) | Browser-native; support varies by browser |
  | Driving distances | `ManualRoutingAdapter` (`src/lib/routing-adapter.ts`) | Traveler types the distance; we generate a Google Maps link |
  | Currency | Manual rates in `app_settings.exchange_rates` | Rates are as fresh as the traveler makes them |

- **Nominatim is only ever called from an explicit button click**, never a debounced text-change handler. Their usage policy asks for this, and per-keystroke geocoding would get us blocked.
- **Tesseract is dynamically imported** so its ~2MB runtime never lands in the main bundle — the Translator is the only page that pays for it.
- **`RoutingAdapter` is an interface with one implementation.** The abstraction exists so a real engine (paid Directions API, or self-hosted OSRM) can be dropped in later without touching a single UI component. Don't inline manual-distance logic into components.

## Live external data (the safety constraint)

- **Scraping/automating vedur.is, road.is, and safetravel.is was explicitly ruled out.** It works against those sites' purpose and terms, and — more importantly — *stale automated safety data is more dangerous than no data.* A cached "roads are clear" from 40 minutes ago can kill someone.
- Instead, the Safety & Weather page gives **one-click links to the real official sources** plus a manual **"reviewed at [time], here's what it said"** log per day/type (`src/features/safety/`).
- The **aurora forecast got the same treatment** — links and a manual log, not a live widget. Same reasoning.
- Treat this app as a checklist and shared notebook, **never as a safety authority.**

## Security & privacy

- **RLS on every table**, gated on `trip_members` via the `is_trip_member()` / `is_trip_owner()` helpers (`0002_profiles_trips_members.sql`). Every new table must follow this.
- **Document vault is end-to-end encrypted in the browser** (AES-256-GCM). A shared passphrase, chosen once and passed out of band, derives the key via PBKDF2 with a random per-trip salt. Only the salt and a small encrypted canary (wrong-passphrase detection) live server-side.
- **The passphrase and derived key are never persisted** — the key lives in memory for the tab's session only, so a reload always re-prompts. Titles and original filenames are encrypted too; blobs sit at opaque UUID paths in a private bucket.
- **A lost passphrase means unrecoverable documents. No admin override, by design.**
- **Encrypted document files are intentionally not cached offline** — offline convenience isn't worth writing decrypted-adjacent material to disk.

## Offline & sync

- PWA with a service worker. **Read data is cached to `localStorage` per view** and rendered with a clear "last synced" label when offline.
- **Writes require connectivity — there is no offline write queue.** Deliberate: a two-person trip doesn't generate enough concurrent offline edits to justify the conflict-resolution machinery.
- **Every list is Realtime-backed** so one traveler's edit appears on the other's phone without a refresh.
- **Concurrent-edit guard:** writes may carry a last-known `updated_at`; a stale write is rejected with `ConflictError` rather than silently clobbering (`src/hooks/use-realtime-table.ts`).

## Timezone rules (two *different* rules — don't unify them)

These look contradictory and are not. The trip timezone constant is `TRIP_TIMEZONE = 'Atlantic/Reykjavik'` in `src/lib/dates.ts`.

- **Daylight times (sunrise/sunset) always render in Iceland local time**, via `toZonedTime`, regardless of the viewer's browser timezone. A traveler checking the plan from India must see Iceland's actual light window, not a number shifted into IST. Previously used `toLocaleTimeString()`, which silently produced wrong times for anyone outside Iceland.
- **Cancellation deadlines echo the digits exactly as typed — no conversion at all.** The `datetime-local` input was never timezone-tagged in the first place, so *any* conversion produced a wrong time. The field is labeled "(IST)" so the traveler knows the frame they're entering in. Implemented by regex-parsing the stored ISO string; **never construct `new Date(iso)` for this field** — that reintroduces the bug.

## Ordering

- **Itinerary days order by `date`, not `sort_order`.** `sort_order` was append-only and never reflected chronology, so adding or removing a day mid-trip scrambled the list. All query sites were switched, and `sort_order` assignment on insert was dropped.
- **`useRealtimeTable` re-sorts local state after INSERT/UPDATE events**, mirroring Postgres's null-last ordering. Without this, live-arriving rows appended to the end regardless of the `orderBy` column — so fixing the column alone wasn't enough.

## Stays

The Stays page went through the most iteration; these are the settled decisions.

- **A stay links to *many* itinerary days, not one.** `itinerary_day_id` was replaced by `itinerary_day_ids uuid[]` with a GIN index (`0013_accommodations_multi_day_link.sql`) so a three-night stay attaches to all three nights.
- **The card shows a date *range* badge derived from the linked days** (e.g. "11 OCT – 12 OCT"), not the check-in date alone.
- **Fields deliberately removed** from the form and/or card: room type, parking notes, full cancellation-policy text, contact name, contact email, and — on the card specifically — the confirmation number, full address, and the documents line. On the ground, none of these are what you reach for; the phone / maps / booking-details links carry the real utility. Don't add them back without a reason.
- **Added:** shared-kitchen cooking option and breakfast-included flag (`0014_stay_shared_kitchen_breakfast.sql`) — both are real filters when picking where to eat.
- **The form is grouped by separators with no visible section labels** (location / amenities / contact / cancellation). Subtle grouping, not headers — headers made a short form feel bureaucratic.
- **Tag styling:** amenity tags are filled orange icons on `rounded-sm` muted pills; action links (phone, maps, booking details) are blue. Corners are `rounded-sm`, never fully rounded — fully-rounded pills read as chips/filters, which these are not.
- **Editing opens by clicking the stay name** (underlined on hover), not a pencil icon button. Removing the icon bought back horizontal space on mobile.
- **In-progress form values persist in `sessionStorage`** (`2icy:stayFormDraft`) so switching browser tabs or an unrelated re-render doesn't wipe what's being typed. This fixed a real, reported data-loss bug — the dialog remounting cleared the form.

## Imports

- **Booking PDFs are parsed client-side with pdf.js** (`src/lib/booking-import.ts`) for flights, accommodations, and rental cars — no upload to a parsing service, which also keeps confirmation documents private.
- **Airbnb reservation PDFs required a specific parser fix**, validated against two real reservation PDFs. Airbnb's layout differs enough from other providers that generic extraction silently produced empty fields.
- Itinerary PDFs can be imported too, creating days in bulk.

## Profile & defaults

- **Profiles carry `first_name` / `last_name` / `gender`** (`0012_profile_and_stay_details.sql`), driving an initials avatar with a fallback chain: first+last → `full_name` → email → `?` (`src/lib/profile.ts`).
- **Packing list and pre-trip tasks ship with curated Iceland shoulder-season defaults** rather than an empty list. An empty checklist is a chore; a pre-filled one you prune is a head start.

## Trip data

- **One canonical trip.** Five scattered/duplicate trips created during development were consolidated into a single trip, with content diffed before every deletion to guarantee no data loss.
- **The QA test account was deliberately preserved** — it's needed for testing future features against non-production data.

## Navigation

- 15 destinations in the sidebar. The **mobile bottom bar shows only four primary paths** (`/`, `/itinerary`, `/safety`, `/expenses`) with everything else behind "More" (`src/components/layout/nav-config.ts`) — those four are the ones you open while actually standing somewhere in Iceland.

---

## Status

All features built and working: itinerary (drag-drop stops, driving segments, daylight, map, print view), stays, flights, rental car + fuel tracking, activities, safety/weather log, expenses (manual FX + CSV export), encrypted document vault, packing list, pre-trip tasks, emergency contacts, translator, shared trip membership with realtime sync, and a dashboard. Typecheck, lint, and the Vitest suite are clean; production build succeeds. Runs against a live Supabase project locally. Not yet deployed to Cloudflare Pages — see README "Deploying to Cloudflare Pages".

See [README.md](README.md) for setup and deployment, and `supabase/migrations/` for the schema and RLS policies.
