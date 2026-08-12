// Boundary sensitivity analysis for the hair-texture classifier.
//
// Recomputes per-window votes + the majority-vote wrapper (same logic as
// lib/hair.ts classifyWindow / classifyTextureFromWindows) with
// parameterizable thresholds, then sweeps each threshold independently to
// find the range where every anchor — 6 real fixtures + 4 synthetic
// references — still reads its expected class.
//
// Usage: npx tsx scripts/hair-boundaries.ts

import sharp from "sharp";
import { resolve as pathResolve } from "node:path";
import type { HairTexture } from "../types/analysis";
import { analyzeHairBand, HAIR_CLASSIFY_GATES } from "../lib/hair";

// Real fixtures with expected classes (matches scripts/hair-calibrate.ts).
const REAL: Array<{ file: string; expected: HairTexture }> = [
  { file: "/test-faces/IMG_5735.jpg", expected: "wavy" },
  { file: "/test-faces/IMG_6399.jpg", expected: "wavy" },
  { file: "/test-faces/straight-hair-1.jpg", expected: "straight" },
  { file: "/test-faces/straight-hair-2.jpg", expected: "straight" },
  { file: "/test-faces/curly-hair-1.jpg", expected: "curly" },
  { file: "/test-faces/curly-hair-2.jpg", expected: "curly" },
];

// Synthetic reference window features (from scripts/hair-calibrate.ts run).
const SYNTHETIC: Array<{ name: HairTexture; windows: Array<{ al: number; t: number }> }> = [
  {
    name: "straight",
    windows: [
      { al: 1.0, t: 0.068 },
      { al: 1.0, t: 0.081 },
      { al: 1.0, t: 0.081 },
    ],
  },
  {
    name: "wavy",
    windows: [
      { al: 0.54, t: 0.048 },
      { al: 0.5, t: 0.047 },
      { al: 0.5, t: 0.045 },
    ],
  },
  {
    name: "curly",
    windows: [
      { al: 0.46, t: 0.159 },
      { al: 0.39, t: 0.157 },
      { al: 0.46, t: 0.158 },
    ],
  },
  {
    name: "coily",
    windows: [
      { al: 0.31, t: 0.367 },
      { al: 0.32, t: 0.378 },
      { al: 0.3, t: 0.387 },
    ],
  },
];

// Derived from the source of truth so newly-added gates flow through the
// sweep automatically instead of needing a manual copy here.
type Gates = { [K in keyof typeof HAIR_CLASSIFY_GATES]: number };

// Source of truth: the gates live in lib/hair.ts (exported) so this sweep
// can never drift from production — that's exactly how coilyT got stale
// here before (hardcoded 0.2 while production had moved).
const CURRENT: Gates = { ...HAIR_CLASSIFY_GATES };

function vote(f: { al: number; t: number }, g: Gates): HairTexture {
  if (f.al >= g.straightAl) return "straight";
  if (f.t >= g.coilyT && f.al <= g.coilyMaxAl) return "coily";
  if (f.t >= g.curlyT && f.al <= g.curlyMaxAl) return "curly";
  return "wavy";
}

// Same majority-vote + hedge logic as classifyTextureFromWindows.
function classify(
  windows: Array<{ al: number; t: number }>,
  g: Gates,
): HairTexture {
  if (windows.length === 0) return "unknown";
  const labels = windows.map((w) => vote(w, g));
  const counts: Partial<Record<HairTexture, number>> = {};
  for (const l of labels) counts[l] = (counts[l] ?? 0) + 1;
  const order: HairTexture[] = ["straight", "wavy", "curly", "coily"];
  const winner =
    [...order].sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0))[0] ??
    "wavy";
  const agree = (counts[winner] ?? 0) / windows.length;
  if (windows.length < 2 || (agree < 2 / 3 && (counts[winner] ?? 0) === 1)) {
    return "wavy";
  }
  return winner;
}

// Collect all anchors: name, expected, windows.
interface Anchor {
  name: string;
  expected: HairTexture;
  windows: Array<{ al: number; t: number }>;
}

async function collectAnchors(): Promise<Anchor[]> {
  const anchors: Anchor[] = [];
  for (const { file, expected } of REAL) {
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
    const img = {
      data: px,
      width,
      height,
      colorSpace: "srgb",
    } as unknown as ImageData;
    const band = {
      top: height * 0.05,
      bottom: height * 0.38,
      left: width * 0.2,
      right: width * 0.8,
    };
    const skinVals: number[] = [];
    for (let y = Math.round(height * 0.35); y <= height * 0.65; y += 2) {
      for (let x = Math.round(width * 0.35); x <= width * 0.65; x += 2) {
        const i = (y * width + x) * 4;
        skinVals.push(0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]);
      }
    }
    const s = [...skinVals].sort((a, b) => a - b);
    const skinLum = s[Math.floor(s.length * 0.85)];
    const res = analyzeHairBand(img, band, skinLum);
    anchors.push({
      name: file,
      expected,
      windows: res.windows.map((w) => ({ al: w.alignment, t: w.tightness })),
    });
  }
  for (const { name, windows } of SYNTHETIC) {
    anchors.push({ name: `synth:${name}`, expected: name, windows });
  }
  return anchors;
}

function allPass(anchors: Anchor[], g: Gates): boolean {
  for (const a of anchors) {
    if (classify(a.windows, g) !== a.expected) return false;
  }
  return true;
}

async function main() {
  const anchors = await collectAnchors();

  console.log("== Anchor window features ==");
  for (const a of anchors) {
    const feats = a.windows
      .map((w) => `al=${w.al.toFixed(2)}/t=${w.t.toFixed(3)}`)
      .join("  ");
    console.log(`  ${a.name}  expected=${a.expected}  [${feats}]`);
  }

  const g = { ...CURRENT };
  console.log(`\nCurrent thresholds: ${JSON.stringify(CURRENT)}`);
  console.log(
    `All anchors pass at current thresholds: ${allPass(anchors, g) ? "YES" : "NO"}`,
  );

  // Sweep each threshold independently over a generous range, step 0.01.
  const sweeps: Array<[keyof Gates, number, number, string]> = [
    ["straightAl", 0.4, 0.8, "straight needs al >= X"],
    ["curlyT", 0.06, 0.3, "curly needs t >= X"],
    ["coilyT", 0.12, 0.35, "coily needs t >= X"],
    ["coilyMaxAl", 0.25, 0.55, "coily needs al <= X"],
    ["curlyMaxAl", 0.35, 0.65, "curly needs al <= X"],
  ];

  console.log("\n== Safe range per threshold (others at current value) ==");
  for (const [key, lo, hi, desc] of sweeps) {
    let minOk = -1;
    let maxOk = -1;
    for (let v = lo; v <= hi + 1e-9; v += 0.01) {
      const trial: Gates = { ...g, [key]: Math.round(v * 100) / 100 };
      if (allPass(anchors, trial)) {
        if (minOk < 0) minOk = Math.round(v * 100) / 100;
        maxOk = Math.round(v * 100) / 100;
      }
    }
    const cur = g[key];
    console.log(
      `  ${key} = ${cur}  (${desc})\n` +
        `    safe: [${minOk < 0 ? "NONE" : minOk} … ${maxOk < 0 ? "NONE" : maxOk}]` +
        `  current is ${minOk <= cur && cur <= maxOk ? "INSIDE" : "OUTSIDE"} safe range`,
    );
  }

  // Report each anchor's distance to its own boundary at current thresholds.
  console.log("\n== Margin analysis at current thresholds ==");
  for (const a of anchors) {
    const medAl = median(a.windows.map((w) => w.al));
    const medT = median(a.windows.map((w) => w.t));
    const label = classify(a.windows, g);
    let margin = 0;
    if (label === "straight") margin = medAl - g.straightAl;
    else if (label === "wavy") margin = g.curlyT - medT;
    else if (label === "curly")
      margin = Math.min(medT - g.curlyT, g.coilyT - medT);
    else margin = medT - g.coilyT;
    console.log(
      `  ${a.name}: reads ${label} (expected ${a.expected})` +
        `  medAl=${medAl.toFixed(2)} medT=${medT.toFixed(3)}` +
        `  margin=${margin >= 0 ? "+" : ""}${margin.toFixed(3)}`,
    );
  }
}

function median(vals: number[]): number {
  const s = [...vals].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}

void main();
