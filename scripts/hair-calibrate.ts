// Calibration probe for the hair-texture classifier.
//
// Runs the SAME shared band analysis the app uses (lib/hair.ts
// analyzeHairBand + classifyTextureFromWindows), so calibration can never
// drift from production. Two inputs:
//
//  1. Synthetic reference textures — four painters, each modeling the real
//     edge structure of its class:
//       straight — aligned vertical strands (dominant edge direction)
//       wavy     — long gentle undulations (mostly vertical, slight scatter)
//       curly    — ringlets: a loop's edges point EVERY direction, so
//                  alignment drops while tightness stays moderate
//       coily    — the same ringlet structure but tighter and denser with
//                  deep shadow troughs → high tightness
//     All four must classify as themselves.
//  2. Real fixture photos — the authoritative ground-truth anchors, each
//     with its known class (verified against real people/photos, not the
//     classifier):
//       IMG_5735 / IMG_6399      → wavy (user's own photos, personally
//                                   confirmed)
//       straight-hair-1 / -2     → straight (Pexels portraits of people
//                                   with pin-straight hair)
//       curly-hair-1 / -2        → curly (Pexels portraits of people with
//                                   defined curls)
//     The script FAILS (non-zero exit) if a synthetic misreads its own class
//     or a real fixture does not read its expected class. The straight/curly
//     ground truth comes from the source photo descriptions, and the crops
//     were selected (with the classifier as a sanity check) to be
//     head-and-shoulders compositions where the fixed band lands on hair —
//     so these PASS assertions are regression guards, not independent
//     validation. CLI can't run MediaPipe, so the hair band is approximated
//     as the upper-middle of the frame and skin luminance is estimated from
//     a strip just below it; the crops make that approximation land on hair
//     the same way it does on the user's selfies.
//
// Usage: npx tsx scripts/hair-calibrate.ts

import sharp from "sharp";
import { resolve as pathResolve } from "node:path";
import type { HairTexture } from "../types/analysis";
import {
  analyzeHairBand,
  classifyTextureFromWindows,
  classifyWindow,
} from "../lib/hair";

const REAL_FIXTURES: Array<{ file: string; expected: HairTexture }> = [
  { file: "/test-faces/IMG_5735.jpg", expected: "wavy" },
  { file: "/test-faces/IMG_6399.jpg", expected: "wavy" },
  { file: "/test-faces/straight-hair-1.jpg", expected: "straight" },
  { file: "/test-faces/straight-hair-2.jpg", expected: "straight" },
  { file: "/test-faces/curly-hair-1.jpg", expected: "curly" },
  { file: "/test-faces/curly-hair-2.jpg", expected: "curly" },
];

// -- Synthetic texture painters ---------------------------------------------
// Each painter draws dark hair on a mid-gray "skin" background. The synthetic
// must reproduce the FEATURES the classifier measures — alignment (top-2
// edge-direction bins) and tightness (edge density gated by shadow contrast)
// — not photorealistic hair.

type Painter = (px: Uint8ClampedArray, w: number, h: number) => void;

const SKIN_LUM = 150; // synthetic "forehead" reference

// Deterministic PRNG so runs are reproducible.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeBuffer(w: number, h: number): Uint8ClampedArray {
  const px = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < px.length; i += 4) {
    px[i] = SKIN_LUM;
    px[i + 1] = SKIN_LUM;
    px[i + 2] = SKIN_LUM;
    px[i + 3] = 255;
  }
  return px;
}

function setPx(px: Uint8ClampedArray, i: number, lum: number): void {
  px[i] = lum;
  px[i + 1] = lum;
  px[i + 2] = lum + 5;
}

// Straight + wavy: vertical strand clumps with a dark core / lighter flanks,
// modulated by a wave. Straight = flat clumps (aligned edges); wavy = long
// gentle waves (mostly vertical, light scatter).
function hairPainter(
  amplitude: number,
  wavelength: number,
  shadowDepth: number,
  clumpWidth: number,
  dephase: number,
): Painter {
  return (px, w, h) => {
    const spacing = 46;
    for (let cx = clumpWidth / 2; cx < w; cx += spacing) {
      for (let y = 0; y < h; y++) {
        const phase = (2 * Math.PI * y) / Math.max(1, wavelength) + dephase * (cx / spacing);
        const bend = amplitude * Math.sin(phase);
        const shadow = shadowDepth * (0.5 - 0.5 * Math.sin(phase));
        for (let dx = -Math.floor(clumpWidth / 2); dx <= Math.floor(clumpWidth / 2); dx++) {
          const xx = Math.round(cx + dx + bend);
          if (xx < 0 || xx >= w) continue;
          const lum = 60 - shadow - Math.abs(dx) * 9;
          setPx(px, (y * w + xx) * 4, Math.max(0, lum));
        }
      }
    }
  };
}

// Curly + coily: RINGLETS. A curl seen from the front is a tight loop, so
// ringlets are the honest model: edges point radially from each loop (in
// EVERY direction → low alignment, the coil signature that separates curls
// from straight/wavy). Each ringlet is lit on its upper arc and shadowed on
// its lower arc — the sharp luminance step supplies real contrast.
//
// The two classes separate on TIGHTNESS: curly loops are larger and sparser
// (moderate edge density + moderate contrast), coily loops are tiny, dense,
// and deeply shadowed (high density + high contrast).
function ringletPainter(params: {
  count: number; // ringlets drawn on the frame
  radius: number; // horizontal loop radius in px
  stretch: number; // vertical stretch (1 = circle, >1 = tall curl loop)
  width: number; // ring thickness in px
  litLum: number; // lit arc
  darkLum: number; // shadowed arc
  seed: number;
}): Painter {
  const { count, radius, stretch, width, litLum, darkLum, seed } = params;
  const rng = mulberry32(seed);
  return (px, w, h) => {
    for (let s = 0; s < count; s++) {
      const cx = rng() * w;
      const cy = rng() * h;
      // Each loop's shadow axis points a random direction — real ringlets
      // catch light from all angles, so a fixed up/down split would bias the
      // direction histogram (a horizontal lit/dark boundary reads as strong
      // vertical alignment, which coils must NOT have).
      // Random shadow axis per loop.
      const rot = rng() * Math.PI * 2;
      for (let a = 0; a < Math.PI * 2; a += 0.04) {
        // Real curls are vertically-elongated loops (tall ellipses). The
        // stretch models that; the classifier separates curly from coily on
        // tightness (curly ~0.16 below the 0.2 coily gate), not alignment.
        const bx = cx + radius * Math.cos(a);
        const by = cy + radius * stretch * Math.sin(a);
        // Lit on one side of the loop's shadow axis, dark on the other.
        const side = Math.sin(a - rot) < 0 ? 1 : -1;
        const lum = side > 0 ? litLum : darkLum;
        for (let o = -width; o <= width; o++) {
          const nx = Math.cos(a) / Math.max(0.01, stretch);
          const ny = Math.sin(a);
          const nl = Math.hypot(nx, ny) || 1;
          const xx = Math.round(bx + (nx / nl) * o);
          const yy = Math.round(by + (ny / nl) * o);
          if (xx < 0 || xx >= w || yy < 0 || yy >= h) continue;
          const i = (yy * w + xx) * 4;
          if (lum < px[i]) setPx(px, i, Math.max(15, lum));
        }
      }
    }
  };
}

const SYNTHETIC: Array<[string, Painter]> = [
  ["straight", hairPainter(0, 1e9, 0, 22, 0)],
  ["wavy", hairPainter(16, 110, 8, 22, 0.4)],
  ["curly", ringletPainter({ count: 55, radius: 15, stretch: 1.7, width: 3, litLum: 104, darkLum: 66, seed: 7 })],
  ["coily", ringletPainter({ count: 320, radius: 7, stretch: 1, width: 2, litLum: 128, darkLum: 18, seed: 13 })],
];

function makeImageData(
  width: number,
  height: number,
  px: Uint8ClampedArray,
): ImageData {
  return { data: px, width, height, colorSpace: "srgb" } as unknown as ImageData;
}

function fmtWindows(
  windows: {
    alignment: number;
    tightness: number;
    contrast: number;
    edgeDensity: number;
  }[],
): string {
  if (windows.length === 0) return "(no windows)";
  return windows
    .map(
      (w) =>
        `[al=${w.alignment.toFixed(2)} ed=${w.edgeDensity.toFixed(2)} c=${w.contrast.toFixed(0)} t=${w.tightness.toFixed(3)}]`,
    )
    .join(" ");
}

async function main() {
  console.log("== Synthetic references (full frame as hair band) ==");
  const W = 400;
  const H = 300;
  let syntheticFail = 0;
  for (const [name, painter] of SYNTHETIC) {
    const px = makeBuffer(W, H);
    painter(px, W, H);
    const img = makeImageData(W, H, px);
    const res = analyzeHairBand(img, { top: 0, bottom: H - 1, left: 0, right: W - 1 }, SKIN_LUM);
    const ok = res.visible && res.texture === name;
    if (!ok) syntheticFail++;
    console.log(
      `\n  ${name}: visible=${res.visible} -> ${res.texture} (conf=${res.textureConfidence.toFixed(2)})` +
        ` color=${res.color}  expected=${name} ${ok ? "PASS" : "FAIL"}\n    ${fmtWindows(res.windows)}`,
    );
    if (res.windows.length > 0) {
      const labels = res.windows.map(classifyWindow);
      console.log(`    per-window labels: [${labels.join(", ")}]`);
    }
  }

  console.log("\n== Real fixtures (hair band approx: upper-middle of frame) ==");
  let realPass = 0;
  let realFail = 0;
  for (const { file, expected } of REAL_FIXTURES) {
    const rel = file.startsWith("/") ? file.slice(1) : file;
    const imagePath = pathResolve(process.cwd(), "public", rel);
    const raw = await sharp(imagePath)
      .resize({ width: 1024, height: 1024, fit: "inside", kernel: "nearest" })
      .raw()
      .ensureAlpha()
      .toBuffer({ resolveWithObject: true });
    const { width, height } = raw.info;
    const px = new Uint8ClampedArray(
      raw.data.buffer,
      raw.data.byteOffset,
      raw.data.byteLength,
    );
    const img = makeImageData(width, height, px);

    // Approximate hair band: upper-middle of the frame. Skin luminance is
    // estimated from a strip just below it (rough forehead position).
    const band = {
      top: height * 0.05,
      bottom: height * 0.38,
      left: width * 0.2,
      right: width * 0.8,
    };
    const skinLum = estimateSkinLum(img, height, width);

    const res = analyzeHairBand(img, band, skinLum);
    // PASS means the fixture read its known class. Confidence below 0.45 is
    // the deliberate honest hedge ("roughly …") — e.g. the sunlit summer
    // wavy photo reads wavy at 0.42 — so the class match is the assertion,
    // not the confidence.
    const ok = res.visible && res.texture === expected;
    if (ok) realPass++;
    else realFail++;
    console.log(
      `\n  ${file}: skin=${skinLum.toFixed(0)} visible=${res.visible} -> ${res.texture}` +
        ` (conf=${res.textureConfidence.toFixed(2)}) color=${res.color}` +
        `  expected=${expected} ${ok ? "PASS" : "FAIL"}\n    ${fmtWindows(res.windows)}`,
    );

    // TRUE per-window votes (classifyWindow, not the majority wrapper which
    // hedges single windows to wavy).
    const labels = res.windows.map(classifyWindow);
    console.log(`    per-window labels: [${labels.join(", ")}]`);
  }

  console.log(`\nSynthetic references: ${SYNTHETIC.length - syntheticFail} pass, ${syntheticFail} fail`);
  console.log(`Real fixtures: ${realPass} pass, ${realFail} fail`);
  if (syntheticFail > 0 || realFail > 0) process.exit(1);
}

function estimateSkinLum(img: ImageData, height: number, width: number): number {
  // Sample a vertical strip through the lower-middle of the frame (rough
  // face position) and take a high percentile — skin is the brightest large
  // region below the hair band, so the median can land on hair/eyes.
  const vals: number[] = [];
  for (let y = Math.round(height * 0.35); y <= height * 0.65; y += 2) {
    for (let x = Math.round(width * 0.35); x <= width * 0.65; x += 2) {
      const i = (y * width + x) * 4;
      const d = img.data;
      vals.push(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]);
    }
  }
  const s = [...vals].sort((a, b) => a - b);
  return s[Math.floor(s.length * 0.85)];
}

void main();
