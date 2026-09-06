# Chizle

See yourself through clearer eyes.

Chizle is a private face-analysis app. Create a profile, answer a short onboarding quiz, then upload a photo and map your face with MediaPipe FaceMesh (468 landmarks). Chizle scores symmetry, facial ratios, posture, expression, and lighting, then returns practical, non-invasive fixes. Photos stay on the device.

## Features

- **Self-improvement hub** (`/dashboard`) — the analysis core plus live
  previews into every practice:
  1. **Analysis & Tracking** — latest scan with mapping/symmetry overlays, the
     Chizle Score ring, and a before-vs-now progress slider.
  2. **Your toolkit** — preview tiles (with live stats) linking to each
     dedicated feature page:
     - `/grooming` — **Hair & Grooming**: a haircut match card that
       recommends named cuts from the face analysis (face shape × hair
       texture) and a daily product stack (texture-, thinning-, and
       beard-aware) that drops straight into the regimen, plus the style &
       maintenance tracker (days since last trim, appointment countdown,
       growth goals) and the per-day product regimen.
     - `/fragrance` — **Fragrance Profile**: scent of the day (by
       occasion/mood) and a fragrance wardrobe with note breakdowns.
     - `/habits` — **Sculpt, Train & Recover** (merged Sculpt + Habits): the
       daily Sculpt List (jawline, face yoga, mewing timers) and complexion
       metrics with trends, a personalized training plan with gym and
       at-home variants, per-exercise set logging against a weekly goal
       (recommended or manual), tap-to-log water tracking against a
       profile-based target, and recovery check-ins (sleep / clean eating)
       with streaks.
  All tracker data is stored per account in the browser (localStorage) and
  resets naturally each day where applicable.
- **Account and onboarding** (`/auth`, `/onboarding`) — email/password authentication followed by a three-step profile quiz.
- **Analyze a photo** (`/analyze`) — shape, symmetry, thirds balance, jawline,
  posture, expression, lighting, and prioritized weakspots with actionable fixes.
- **Then vs Now** (`/compare`) — compare two photos and see what measurably
  changed, including your dating-profile score movement.
- **Dating profile scorecard** (`/scorecard`) — a 1–10 across approachability,
  photo quality, and style, with a verdict (primary / secondary / fix / reframe).

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
lib/          Analysis pipeline and Supabase clients/types
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
