# Iceland Trip Tracker

A shared, installable trip-management PWA for two people planning and running an Iceland road trip. Day-by-day itinerary with maps and driving segments, daylight windows, stays, flights, rental car + fuel tracking, booked activities, a safety/weather dashboard (manual review, official links only), expenses with manual FX, an end-to-end encrypted document vault, packing list, pre-trip tasks, and emergency contacts — all shared in real time between both travelers via Supabase, with offline-friendly caching for the read views.

See [CLAUDE.md](CLAUDE.md) for the original product brief this was built from.

## Stack

React 19 + Vite + TypeScript · Tailwind CSS v4 · Radix UI primitives (shadcn-style) · Supabase (Auth, Postgres, Storage, Realtime) · MapLibre GL JS + OpenFreeMap · Web Crypto (AES-256-GCM) · Zod · date-fns/date-fns-tz · SunCalc · Vitest · Cloudflare Pages.

No paid APIs are used anywhere, and no Anthropic/Claude API is called at runtime.

## Local development

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase

You need a free [Supabase](https://supabase.com) project (or the local Supabase CLI stack — see below).

**Option A — hosted Supabase project (simplest):**

1. Create a project at [supabase.com](https://supabase.com/dashboard).
2. In the SQL Editor, run every file in [`supabase/migrations/`](supabase/migrations) **in filename order** (`0001_...` through `0010_...`). Each is idempotent-ish but not re-runnable after the fact — run once, in order.
3. In **Authentication → URL Configuration**, set the Site URL and an additional Redirect URL to your local dev URL (`http://127.0.0.1:5173`) and later your deployed URL.
4. In **Authentication → Email**, magic link/OTP sign-in is on by default; no extra config needed. Password auth is unused by this app.
5. Copy your Project URL and anon/public key from **Project Settings → API**.
6. Do **not** run [`supabase/seed.sql`](supabase/seed.sql) against this hosted project — it's local-dev-only demo data (see the warning at the top of that file).

**Option B — local Supabase CLI stack (for offline/throwaway dev):**

```bash
npx supabase init   # if you don't already have a supabase/config.toml (this repo ships one)
npx supabase start  # applies migrations + seed.sql automatically
```

This gives you a local Postgres + Auth + Storage + Realtime stack and a local Inbucket inbox at `http://127.0.0.1:54324` where magic-link emails land during development. `supabase start` prints the local URL/anon key to use in `.env`.

### 3. Configure environment variables

```bash
cp .env.example .env
```

Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from step 2. Set `VITE_APP_URL` to `http://127.0.0.1:5173` for local dev.

### 4. Run it

```bash
npm run dev
```

Open the printed local URL, sign in with your email (a magic link is sent — check Inbucket for local Supabase, or your real inbox for a hosted project), then create your trip. Invite your partner from **Settings** by email; once they sign in with that address they'll see the same trip.

### Available scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Typecheck + production build |
| `npm run preview` | Preview the production build locally |
| `npm run typecheck` | `tsc -b --noEmit` |
| `npm run lint` | ESLint |
| `npm run test` | Run the Vitest suite once |
| `npm run test:watch` | Vitest in watch mode |
| `npm run format` | Prettier write |

## How the shared-trip model works

- `trips` / `trip_members` model a trip with an **owner** and **editor** role. Every other table is scoped by `trip_id` (directly or via a parent record) and protected by Postgres Row Level Security — see `supabase/migrations/0002_profiles_trips_members.sql` for the `is_trip_member()` / `is_trip_owner()` helper functions every policy uses.
- Signing in for the first time with no existing trip drops you into onboarding to create one; you're automatically its owner.
- Inviting your partner (Settings page) creates a `trip_members` row keyed by their email with `status: 'invited'`. There's no invite-email sending here (no email provider configured) — tell them directly to sign in with that address, or wire up a Supabase Edge Function / email provider if you want automated invite emails.
- Every list in the app is backed by Supabase Realtime, so edits from one device show up live on the other without a refresh.
- Concurrent-edit safety: editing a record can pass its last-known `updated_at`; if someone else changed it in the meantime the write is rejected with a conflict rather than silently overwritten (see `ConflictError` in `src/hooks/use-realtime-table.ts`).

## The document vault

Documents (passports, insurance, confirmations, licences) are encrypted **in the browser** with AES-256-GCM before upload:

- A shared vault passphrase (chosen once by either of you, shared out of band — text it, say it, whatever — never typed into any other system) derives an AES key via PBKDF2 with a random per-trip salt.
- Only the salt and a small encrypted "canary" value (to detect a wrong passphrase) are stored server-side, in `app_settings`. The passphrase itself and the derived key are **never** persisted — the key lives only in memory for the tab's session, so a page reload always asks for the passphrase again.
- File blobs live in the private `trip-documents` Storage bucket under an opaque UUID path, not the real filename. The title and original filename are themselves encrypted as document metadata.
- **If you lose the passphrase, encrypted documents cannot be recovered.** There is no admin override, by design.

## Safety & weather data

This app does **not** scrape or automate Vedur, road.is, or SafeTravel — that's against those sites' purpose and terms, and stale automated data is more dangerous than none. Instead, the Safety & Weather page gives you one-click links to the real, current official sources, and lets you (or your partner) log a manual "reviewed at [time], here's what it said" note per day. Treat this app as a checklist and shared notebook, never as a safety authority — always defer to the official sources and to 112 in an actual emergency.

## Offline behavior

This is a PWA (installable, works over HTTPS with a service worker via `vite-plugin-pwa`). Read data (itinerary, stays, activities, safety log, expenses, documents metadata, packing list, tasks, emergency contacts) is cached to `localStorage` on every successful load, so those views still render — clearly labeled as showing last-synced data — when offline. Writes require connectivity; there's no offline write queue. Encrypted document *files* are intentionally not cached offline.

## Routing / driving distances

There's no paid directions API. `src/lib/routing-adapter.ts` defines a `RoutingAdapter` interface with a `ManualRoutingAdapter` (the only implementation shipped) so distance/duration between stops is whatever you type in, plus a generated "open this route in Google Maps" link for every driving segment. If you later want real routing, implement the interface against a paid API or a self-hosted OSRM instance and swap it in — no UI code needs to change.

## Deploying to Cloudflare Pages

This ships a static Vite SPA, which Cloudflare Pages serves for free with a GitHub-connected deploy pipeline (deploys on every push, PR previews included).

1. Push this repo to GitHub.
2. In the [Cloudflare dashboard](https://dash.cloudflare.com) → **Workers & Pages → Create → Pages → Connect to Git**, pick the repo.
3. Build settings:
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Add environment variables (**Settings → Environment variables**, for both Production and Preview): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_APP_URL` (set this to the `*.pages.dev` URL Cloudflare gives you, or your custom domain).
5. Deploy. Cloudflare Pages auto-detects `public/_redirects` (SPA fallback routing) and `public/_headers` (security headers + CSP) — both already included in this repo, nothing else to configure.
6. Back in Supabase, add the deployed URL to **Authentication → URL Configuration** (Site URL + Redirect URLs) so magic links redirect correctly in production.

No Workers-specific code is used, so `wrangler.toml` isn't needed for this static-SPA deployment path; Cloudflare Pages' Git integration handles the build and deploy entirely from the dashboard settings above.

## CI

[`/.github/workflows/ci.yml`](.github/workflows/ci.yml) runs typecheck, lint, tests, and build on every push/PR to `main`. It never touches Supabase, never deploys, and never uploads documents or secrets — it builds with placeholder, non-functional env values purely to verify the build step itself succeeds.

## Security notes

- Every table has Row Level Security enabled; policies gate all reads/writes on `trip_members` membership (see migrations for the exact policies).
- The `trip-documents` Storage bucket is private; access is also gated by trip membership via storage RLS policies keyed off the `<trip_id>/<uuid>` object path.
- `supabase/seed.sql` is local-dev-only — Supabase CLI only runs it for `supabase db reset`/`supabase start` against your local stack, never against a linked/hosted project via `supabase db push`.
- `.gitignore` excludes `.env*`, local Supabase state, and CSV exports so nothing sensitive lands in git.
