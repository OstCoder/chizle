# Chizle

See yourself through clearer eyes.

Chizle is a private face-analysis app. Answer two quick questions, upload a photo, and the AI maps your face with MediaPipe FaceMesh (468 landmarks) — scoring symmetry, facial ratios, posture, expression, and lighting, then handing you a personalized daily routine. Photos stay on the device.

## Features

- **Self-improvement hub** (`/dashboard`) — two focused sections:
  1. **Analysis & Tracking** — latest scan with mapping/symmetry overlays, the
     Chizle Score ring, and an interactive "Before vs. Now" split-screen
     slider: pick any two scans from your history and drag a divider to wipe
     between the photos, with the metric deltas recomputing for that pair.
  2. **Daily Routine Checklist** — one consolidated widget covering the
     Sculpt List, daily workout, water goal, grooming products, and scent of
     the day. One tap per row; the detailed tracking lives one tap away.
- **Analyze** (`/analyze`) — the core flow: drop a front-facing photo and get
  a quick read (shape, photo quality) plus prioritized weakspots with
  actionable fixes. Individual symmetry scores and the detailed posture
  breakdown sit behind a collapsible "View detailed analysis" panel. A
  **rating panel** shows the overall score with a potential score (current →
  potential on a /10 scale), feature-by-feature breakdowns (skin quality with
  flagged issues, hair & style match, facial structure & symmetry), and a
  "How to reach your potential" action plan that links low-scoring areas to a
  prioritized checklist with estimated score improvements per habit. A
  **Glow-Up Progress Tracker** plots every saved scan on an interactive line
  chart (symmetry, jawline sharpness, skin clarity) with toggleable series and
  hover inspection. **Export Full Report** compiles the latest scan into a
  clean, downloadable one-page PDF — overall + potential score, feature
  breakdowns, detected attributes, the prioritized action plan with estimated
  gains, and the personalized daily routine as a printable checklist.
- **Grooming** (`/grooming`) — a haircut match card that recommends named cuts
  from the face analysis (face shape × hair texture) and a daily product
  stack (texture-, thinning-, and beard-aware) that drops straight into the
  regimen, plus the style & maintenance tracker, the per-day product regimen,
  and the daily scent log (occasion/mood). Recommended products and regimen
  items include direct purchase links. An **Ingredient Safety & Synergy**
  card reads skin flags from the latest scan (localized redness, breakout
  texture, dehydration, shine, dullness, tired eyes — via a face-region
  redness proxy added to the pipeline) and maps them to ingredients to look
  for (niacinamide, azelaic acid, salicylic acid, ceramides, caffeine, …),
  ingredients to go easy on, and a synergy read that surfaces power pairs
  and conflicts (retinol × BHA, retinol × BPO, vitamin C × BPO) with AM/PM
  scheduling fixes.
- **Habits** (`/habits`) — the daily Sculpt List (jawline, face yoga, mewing
  timers), complexion metrics with trends, smart skincare picks matched to
  the latest scan (each with a direct purchase link), an AM/PM skincare log
  (morning + evening routine toggles), a personalized training
  plan with gym and at-home variants, tap-to-log water tracking against a
  profile-based target, and a 30-second daily check-in (workout / clean
  eating / sleep).
- **Glow-up streak** (header, all pages) — a flame badge counting consecutive
  complete days. A day is complete when AM + PM skincare are both logged,
  plus grooming (all regimen products applied) and the workout once the user
  has started tracking those. The popover shows today's four pillars with
  one-tap AM/PM logging, the milestone reached (e.g. "7-Day Glow-Up
  Streak!"), and a progress bar toward the next milestone (3, 5, 7, 14, 21,
  30, 60, 100 days). It live-updates as checklists are completed anywhere in
  the app; the AM/PM rows also sit in the dashboard's Daily Routine
  Checklist.
- **Account and onboarding** (`/auth`, `/onboarding`) — email/password
  authentication followed by a two-question setup (primary goal + age) and an
  immediate scan CTA, so the first result lands within seconds.
- **Extras** — **Then vs Now** (`/compare`) compares two photos and shows what
  measurably changed; **Scorecard** (`/scorecard`) rates a photo 1–10 with a
  verdict. Both sit outside the main three-item navigation.

**Smart product recommendations** — skincare picks on `/habits` and haircare
products on `/grooming` are matched to the user's scan metrics (complexion
proxies, weakspots, face shape, hair texture) and onboarding goals, each with
a direct Amazon search "Buy" link. Set `NEXT_PUBLIC_AMAZON_AFFILIATE_TAG`
(public env var) to attribute those links with an Amazon Associates tag;
without it the links stay plain search results.

All tracker data is stored per account in the browser (localStorage) and
resets naturally each day where applicable.

Everything runs in the browser via MediaPipe (vendored under
`/public/mediapipe/`). Images never leave the device, and analysis history is
scoped per account — each user only ever sees their own scans. Account
credentials and onboarding profile metadata are stored securely in Supabase
with row-level security.

The repo keeps a headless fixture harness (`npm run validate`) for pipeline
regression checks; it is not exposed in the app.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Supabase setup

The app uses Supabase for email/password auth and the user profile database.

1. Create a Supabase project.
2. Run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL Editor. It creates the `profiles` table, the signup trigger, and user-only row-level security policies.
3. In Freebuff, add these keys under Settings -> Environment:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Enable the Email provider under Supabase Authentication -> Providers.
5. Set the Supabase Site URL to the app URL and allow the app URL plus `/auth/callback` as redirect URLs.

The app does not need a service-role key. Never expose one to the browser.

After a user signs up and confirms their email, they are routed to `/onboarding`. Completing the quiz saves gender, age, height, weight, unit system, hair type, goals, and `onboarding_completed` to that user's profile row. Existing authenticated users with completed onboarding go directly to `/analyze`.

## Scripts

| Command             | What it does                                                     |
| ------------------- | ----------------------------------------------------------------- |
| `npm run dev`       | Start the Next.js dev server                                     |
| `npm run build`     | Production build (typechecks + lints all routes)                 |
| `npm run typecheck` | `tsc --noEmit` over the whole project                            |
| `npm run lint`      | ESLint via `next lint`                                           |
| `npm run validate`  | CLI fixture validation (analytical pipelines only; no MediaPipe) |

## Architecture

```
app/          Next.js routes and server actions
  auth/       Supabase email/password login, signup, and callback
  onboarding/ Three-step profile quiz
  actions/    Authenticated profile persistence
components/   UI: uploaders, views, mesh overlay, weakspot cards, site shell
lib/          Analysis pipeline (incl. reportPdf one-page PDF composer) and Supabase clients/types
  mediapipe.ts    Lazy FaceLandmarker loader (GPU -> CPU fallback)
  analysis.ts     Aggregates ratios/symmetry/posture/expression/light
  ratios.ts       Face ratios + 3D depth metrics (chin/midface projection)
  symmetry.ts     Mirror-diff symmetry with eye-line roll un-tilting
  posture.ts      4x4 transform -> yaw/pitch/roll (matrix or heuristic)
  expression.ts   Blendshape-driven smile/eye/brow with geometric fallback
  imageQuality.ts Canvas-based brightness/contrast/evenness/sharpness
  recommendations.ts Weakspot generation + actionable fixes
  scorecard.ts    Dating-profile scorecard (3 buckets + verdict)
  comparison.ts   Then-vs-Now delta engine
middleware.ts    Supabase session refresh and auth/onboarding redirects
supabase/        Profile schema, RLS policies, and setup notes
types/           Shared TypeScript types for the analysis pipeline
data/            Test fixture definitions
public/test-faces/  Fixture photos + synthetic SVGs
public/mediapipe/   Vendored MediaPipe model + WASM (no CDN dependency)
```

The analysis pipeline is deliberately split into pure functions over
`ImageData` + landmarks so the CLI validator (`scripts/validate-fixtures.ts`)
can run the analytical code paths headlessly with `sharp`, and the browser
runs the identical code with canvas + MediaPipe.

## Adding a test fixture

1. Drop a photo into `public/test-faces/`.
2. Add an entry in `data/test-gallery.ts` with `expected.hasFace: true`.
3. Run the browser pipeline on it once from `/test-gallery`'s "Calibrate on
   your photo" section, copy the suggested ranges, and paste them into the
   fixture. Tighten tolerances until something breaks - that's your regression
   boundary.

## Notes

- MediaPipe assets are vendored locally; the model is ~36 MB and loads once
  per session (5-10 s on first visit).
- The browser and CLI agree within +/-0.01 on lighting metrics because both
  pipelines downscale to 1024 px with nearest-neighbour sampling and canvas
  smoothing disabled.
