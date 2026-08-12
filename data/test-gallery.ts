// Test fixture definitions for /test-gallery.
//
// Each fixture has:
//   - `image`: a same-origin path under /public (typically a synthetic SVG)
//   - `expected`: ranges/booleans the live AnalysisReport should match
//
// The bundled fixtures are deliberately SVG-only so they can be generated
// deterministically and they exercise the no-face / lighting-only branches of
// the analyzer. To exercise face / blendshape / depth code paths, drop a real
// photo into /public/test-faces/, swap its `image` here, and add the matching
// expected values (use the dev build's actual output as a starting point and
// add reasonable tolerances).

import type { Fixture } from "@/lib/testGallery";

export interface TestGalleryConfig {
  version: number;
  notes: string;
  fixtures: Fixture[];
}

export const testGallery: TestGalleryConfig = {
  version: 1,
  notes:
    "Synthetic SVG fixtures exercise the no-face / lighting-only code paths. For face / blendshape / depth coverage, replace each entry's `image` with a real photo under /public/test-faces/ and add the matching expected blocks (shape, symmetry, smile, ratios, posture).",
  fixtures: [
    {
      id: "dark-low-light",
      name: "Dark gradient",
      image: "/test-faces/dark-low-light.svg",
      description:
        "Forces the lighting-exposure code path with no face present. Brightness should land in the 'too dim' band.",
      expected: {
        hasFace: false,
        light: {
          brightness: [25, 70],
          evenness: [0.55, 1.0],
          sharpness: [0, 0.4],
        },
        weakspotCount: [0, 0],
      },
    },
    {
      id: "overexposed-high-light",
      name: "Overexposed frame",
      image: "/test-faces/overexposed-high-light.svg",
      description:
        "Bright pastel gradient. Brightness in the 'too bright' band; evenness high.",
      expected: {
        hasFace: false,
        light: {
          brightness: [220, 255],
          evenness: [0.85, 1.0],
        },
        weakspotCount: [0, 0],
      },
    },
    {
      id: "sharp-edges",
      name: "High-contrast grid",
      image: "/test-faces/sharp-edges.svg",
      description:
        "Checkerboard pattern designed to maximize the fourth-difference (Laplacian) sharpness detector.",
      expected: {
        hasFace: false,
        light: {
          contrast: [0.6, 1.0],
          sharpness: [0.3, 1.0],
          brightness: [110, 145],
        },
        weakspotCount: [0, 0],
      },
    },
    {
      id: "rishi",
      name: "rishiwinter",
      image: "/test-faces/IMG_5735.jpg",
      description:
        "Real photo of a person (front-facing, soft daylight). Exercises the face / blendshape / depth code paths. Pipeline-aligned: lib/imageData.ts canvas smoothing OFF + scripts/validate-fixtures.ts sharp resize(1024, kernel: nearest). Browser and CLI both report sharpness ~1.0 (saturated by JPEG blockiness at 1024 downsampled resolution). midfaceProjection hand-written as a negative range (lib/testGallery.ts clampRange now keeps sign). landmarksConfidence [0.5, 1.0] after lib/ratios.ts treats MediaPipe visibility: 0 as missing. lib/symmetry.ts now un-tilts every landmark by -atan2(eye-line) before computing mirror diffs, so a rolled head no longer collapses symmetry.overall to 0. Post-fix browser actual: 81/100; symmetry.overall tightened to [76.0, 86.0].",
      expected: {
        hasFace: true,
        shape: "oblong",
        angle: "front",
        light: {
          brightness: [93.0, 100.0],
          evenness: [0.65, 0.71],
          contrast: [0.67, 0.74],
          sharpness: [0.85, 1.0]
        },
        symmetry: {
          overall: [76.0, 86.0],
          eyeLevel: [88.0, 99.0],
          lipLevel: [33.0, 44.0]
        },
        smile: {
          detected: false,
          score: [0, 5],
          smileLeft: [0, 0.15],
          smileRight: [0, 0.15]
        },
        ratios: {
          facialIndex: [0.86, 0.94],
          jawlineAngle: [115.0, 131.0],
          thirdsBalance: [0.30, 0.38],
          chinProjection: [0.0, 0.08],
          midfaceProjection: [-0.15, -0.03],
          landmarksConfidence: [0.5, 1.0]
        },
        posture: {
          yawAbs: [0, 6.0],
          pitchAbs: [0, 10.0],
          rollAbs: [0, 6.0],
          headTiltAbs: [0, 2.0]
        }
      },
    },
    {
      id: "rishi2",
      name: "rishisummer",
      image: "/test-faces/IMG_6399.jpg",
      description:
        "Real photo of a person (front-facing, brighter outdoor light). Exercises the face / blendshape / depth code paths. Same pipeline fix as rishi: browser ~0.72, CLI ~0.62 (post-resize). The dual-pipeline gap narrowed from ~6x (0.72 vs 0.12) to ~1.2x thanks to the resize. midfaceProjection hand-written as a negative range. landmarksConfidence [0.5, 1.0]. lib/symmetry.ts applies the same eye-roll un-tilt as rishi so a rolled head no longer collapses symmetry.overall to 0. Post-fix browser actual: 67/100; symmetry.overall tightened to [62.0, 72.0].",
      expected: {
        hasFace: true,
        shape: "oblong",
        angle: "front",
        light: {
          brightness: [150.0, 157.0],
          evenness: [0.68, 0.74],
          contrast: [0.67, 0.73],
          sharpness: [0.55, 0.80]
        },
        symmetry: {
          overall: [62.0, 72.0],
          eyeLevel: [63.0, 78.0],
          lipLevel: [0, 5.0]
        },
        smile: {
          detected: false,
          score: [0, 5],
          smileLeft: [0, 0.15],
          smileRight: [0, 0.15]
        },
        ratios: {
          facialIndex: [0.88, 0.95],
          jawlineAngle: [115.0, 131.0],
          thirdsBalance: [0.38, 0.47],
          chinProjection: [0.0, 0.09],
          midfaceProjection: [-0.12, -0.02],
          landmarksConfidence: [0.5, 1.0]
        },
        posture: {
          yawAbs: [0, 7.0],
          pitchAbs: [0, 10.0],
          rollAbs: [0, 9.0],
          headTiltAbs: [0, 3.5]
        }
      },
    },
    {
      id: "no-face-blob",
      name: "Soft mid-tone gradient",
      image: "/test-faces/no-face-blob.svg",
      description:
        "Smooth radial gradient. No face — exercises the emptyReport path. Smoothness should keep sharpness low.",
      expected: {
        hasFace: false,
        light: {
          brightness: [80, 170],
          evenness: [0.4, 1.0],
          sharpness: [0, 0.4],
        },
        weakspotCount: [0, 0],
      },
    },
  ],
};
