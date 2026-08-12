# Chizle

See yourself through clearer eyes.

Chizle is a fully client-side face-analysis app. Upload a photo and it maps your
face with MediaPipe FaceMesh (468 landmarks), then scores symmetry, facial
ratios, posture, expression, and lighting — and hands you a list of practical,
non-invasive fixes. No filters, no faking, no uploads.

## Features

- **Analyze a photo** (`/analyze`) — shape, symmetry, thirds balance, jawline,
  posture, expression, lighting, and prioritized weakspots with actionable fixes.
- **Then vs Now** (`/compare`) — compare two photos and see what measurably
  changed, including your dating-profile score movement.
- **Dating profile scorecard** (`/scorecard`) — a 1–10 across approachability,
  photo quality, and style, with a verdict (primary / secondary / fix / reframe).
- **Try a sample** — every tool ships with bundled sample photos so you can
  test the pipeline without hunting for a photo.
- **Test gallery** (`/test-gallery`) — a dev harness that runs the analysis
  pipeline against fixed fixtures and reports pass/fail per assertion.

Everything runs in the browser via MediaPipe (vendored under
`/public/mediapipe/`). Images never leave the device — no accounts, no
telemetry.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Scripts

| Command            | What it does                                                        |
| ------------------ | ------------------------------------------------------------------- |
| `npm run dev`      | Start the Next.js dev server                                        |
| `npm run build`    | Production build (typechecks + lints all routes)                    |
| `npm run typecheck`| `tsc --noEmit` over the whole project                               |
| `npm run lint`     | ESLint via `next lint`                                              |
| `npm run validate` | CLI fixture validation (analytical pipelines only; no MediaPipe)    |

## Architecture

```
app/          Next.js routes (analyze, compare, scorecard, test-gallery)
components/   UI: uploaders, views, mesh overlay, weakspot cards
lib/          Analysis pipeline (pure functions, unit-testable)
  mediapipe.ts    Lazy FaceLandmarker loader (GPU → CPU fallback)
  analysis.ts     Aggregates ratios/symmetry/posture/expression/light
  ratios.ts       Face ratios + 3D depth metrics (chin/midface projection)
  symmetry.ts     Mirror-diff symmetry with eye-line roll un-tilting
  posture.ts      4x4 transform → yaw/pitch/roll (matrix or heuristic)
  expression.ts   Blendshape-driven smile/eye/brow with geometric fallback
  imageQuality.ts Canvas-based brightness/contrast/evenness/sharpness
  recommendations.ts Weakspot generation + actionable fixes
  scorecard.ts    Dating-profile scorecard (3 buckets + verdict)
  comparison.ts   Then-vs-Now delta engine
types/        Shared TypeScript types for the whole pipeline
data/         Test fixture definitions
public/test-faces/  Fixture photos + synthetic SVGs
public/mediapipe/   Vendored MediaPipe model + WASM (no CDN dependency)
```

The pipeline is deliberately split into pure functions over
`ImageData` + landmarks so the CLI validator (`scripts/validate-fixtures.ts`)
can run the analytical code paths headlessly with `sharp`, and the browser
runs the identical code with canvas + MediaPipe.

## Adding a test fixture

1. Drop a photo into `public/test-faces/`.
2. Add an entry in `data/test-gallery.ts` with `expected.hasFace: true`.
3. Run the browser pipeline on it once from `/test-gallery`'s "Calibrate on
   your photo" section, copy the suggested ranges, and paste them into the
   fixture. Tighten tolerances until something breaks — that's your regression
   boundary.

## Notes

- MediaPipe assets are vendored locally; the model is ~36 MB and loads once
  per session (5–10 s on first visit).
- The browser and CLI agree within ±0.01 on lighting metrics because both
  pipelines downscale to 1024 px with nearest-neighbour sampling and canvas
  smoothing disabled.
