// Hair analysis: reads the wearer's hair color + texture from the band of
// pixels above the face landmarks, then combines the read with face shape to
// recommend styles.
//
// This is an approximate pixel heuristic, not a trichology report:
//  - the region above the hairline is sampled for luminance / hue / gradients
//  - only hair-like pixels are kept — the mask is anchored to the band median
//    AND to the forehead skin (hair is darker than skin in essentially every
//    photo), so a bright wall or sky can't pollute the read
//  - `visible` is false when the band is empty, cropped, or uniform (hair
//    pulled back, a hat, the head cropped out of frame, or a smooth wall)
//  - color is classified from hue/saturation/lightness bands
//  - texture is decided by majority vote across three horizontal windows of
//    the band. Each window votes on two features: edge-direction alignment
//    (straight hair shows a strongly dominant direction) and a tightness
//    score (edge density gated by shadow contrast — coils are dense AND cast
//    deep shadows AND scatter directions). The wavy middle is deliberately
//    wide so a wavy person doesn't flip to coily/straight on photo noise.
//  - the label is hedged ("roughly wavy") when the windows disagree, the
//    read sits on a class boundary, or the window votes are sparse.
// The UI should present the read as an estimate ("hair reads as …").

import type {
  FaceShape,
  HairColor,
  HairProfile,
  HairTexture,
  LandmarkPoint,
} from "@/types/analysis";
import { clamp } from "./utils";

/** Default profile for reports where no face / no hair region was found. */
export const UNKNOWN_HAIR: HairProfile = {
  visible: false,
  color: "unknown",
  texture: "unknown",
  confidence: 0,
};

export const HAIR_COLOR_LABEL: Record<HairColor, string> = {
  black: "Black",
  "dark-brown": "Dark brown",
  brown: "Brown",
  "light-brown": "Light brown",
  blonde: "Blonde",
  auburn: "Auburn",
  gray: "Gray",
  unknown: "Unknown",
};

export const HAIR_TEXTURE_LABEL: Record<HairTexture, string> = {
  straight: "Straight",
  wavy: "Wavy",
  curly: "Curly",
  coily: "Coily",
  unknown: "Unknown",
};

const MIN_REGION_PIXELS = 30;
const MIN_WINDOW_PIXELS = 15;
// Windows with almost no edges vote on noise (alignment from 2 edges is
// meaningless) — require a real signal before a window gets a vote.
const MIN_WINDOW_EDGES = 5;

/**
 * Display label for a hair texture read, hedged when the classifier was
 * borderline: a low `textureConfidence` renders "roughly wavy" instead of
 * stating "wavy" as fact. Legacy reports without the field default to the
 * plain label.
 */
export function hairTextureLabel(hair: HairProfile): string {
  if (hair.texture === "unknown") return HAIR_TEXTURE_LABEL.unknown;
  const base = HAIR_TEXTURE_LABEL[hair.texture];
  const conf = hair.textureConfidence ?? 0.5;
  return conf < 0.45 ? `Roughly ${base.toLowerCase()}` : base;
}

// ---------------------------------------------------------------------------
// Shared band analysis (used by analyzeHair AND the calibration script, so
// calibration can never drift from production)
// ---------------------------------------------------------------------------

export interface HairBandRect {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface HairWindowFeatures {
  alignment: number; // top-2 direction bin fraction
  tightness: number; // edge density gated by shadow contrast
  contrast: number; // luminance stddev over the window's hair pixels
  edgeDensity: number;
  samples: number;
  edges: number;
}

export interface HairBandResult {
  color: HairColor;
  texture: HairTexture;
  textureConfidence: number;
  confidence: number;
  visible: boolean;
  /** Median luminance of the masked (hair) pixels — for color/visibility. */
  hairLum: number;
  windows: HairWindowFeatures[];
}

/**
 * Analyze a rectangular band above the face for hair color + texture.
 * `skinLum` is the forehead reference luminance; the mask keeps pixels darker
 * than both `skinLum * 0.95` and the band median * 1.05 — hair is darker than
 * skin, and this double gate excludes bright walls/sky AND dark backgrounds.
 */
export function analyzeHairBand(
  data: ImageData,
  rect: HairBandRect,
  skinLum: number,
): HairBandResult {
  const { width, height } = data;
  const top = Math.max(0, Math.round(rect.top));
  const bottom = Math.min(height - 1, Math.round(rect.bottom));
  const left = Math.max(0, Math.round(rect.left));
  const right = Math.min(width - 1, Math.round(rect.right));

  // Pass 1: band luminance distribution → band median for the mask. The mask
  // stays anchored to the band itself (hair dominates the band in a properly
  // framed shot) rather than to an estimated skin value, which is unreliable
  // in dark photos. Background walls are typically brighter than hair, so
  // keeping pixels darker than the band median excludes them.
  const bandLums: number[] = [];
  for (let y = top; y <= bottom; y += 2) {
    for (let x = left; x <= right; x += 2) {
      bandLums.push(luminanceAt(data, x, y));
    }
  }
  if (bandLums.length < MIN_REGION_PIXELS) return emptyBandResult();
  const bandMedian = median(bandLums);
  // Hybrid mask: keep pixels darker than the band anchor (hair dominates the
  // band in a properly framed shot; walls/sky are brighter) AND darker than
  // the forehead skin (hair is darker than skin in essentially every photo).
  // The skin leg matters when the band is background-dominated (cropped
  // head); the band leg matters when the skin estimate is off in dark photos.
  const maskLum = Math.min(
    bandMedian * 1.05,
    bandMedian + 12,
    skinLum * 0.95,
  );
  // Edge threshold adapts to the band's darkness: dark photos carry more
  // sensor noise, so a fixed threshold would let noise masquerade as hair
  // texture. A dark band requires stronger gradients.
  const edgeThreshold = Math.max(20, (255 - bandMedian) * 0.15);

  // Split the band into three horizontal windows (left / center / right).
  const WINDOWS = 3;
  const winW = Math.max(1, (right - left + 1) / WINDOWS);
  const winAcc = Array.from({ length: WINDOWS }, () => ({
    lums: [] as number[],
    hues: [] as number[],
    sats: [] as number[],
    dirBins: new Array<number>(8).fill(0),
    edges: 0,
    samples: 0,
  }));

  for (let y = top; y <= bottom; y += 2) {
    for (let x = left; x <= right; x += 2) {
      const lum = luminanceAt(data, x, y);
      if (lum > maskLum) continue; // background / skin — skip
      const w = Math.min(WINDOWS - 1, Math.floor((x - left) / winW));
      const win = winAcc[w];
      win.samples++;
      win.lums.push(lum);
      const { h, s } = rgbToHsl(data.data, (y * width + x) * 4);
      if (s > 0.12) win.hues.push(h);
      win.sats.push(s);

      // Gradients on box-blurred luminance → single-pixel noise suppressed.
      // (Blur must stay gentle: it also erodes the wave-direction scatter
      // that separates wavy hair from straight.)
      const gx =
        luminanceAt(data, x + 1, y) - luminanceAt(data, x - 1, y);
      const gy =
        luminanceAt(data, x, y + 1) - luminanceAt(data, x, y - 1);
      const mag = Math.sqrt(gx * gx + gy * gy);
      if (mag > edgeThreshold) {
        win.edges++;
        const ang = Math.atan2(gy, gx); // [-π, π]
        const bin = Math.floor(((ang + Math.PI) / (2 * Math.PI)) * 8) % 8;
        win.dirBins[bin]++;
      }
    }
  }

  const totalSamples = winAcc.reduce((a, w) => a + w.samples, 0);
  const totalEdges = winAcc.reduce((a, w) => a + w.edges, 0);
  if (totalSamples < MIN_REGION_PIXELS || totalEdges === 0) {
    return emptyBandResult();
  }

  // Global color + luminance stats.
  const allLums = winAcc.flatMap((w) => w.lums);
  const allSats = winAcc.flatMap((w) => w.sats);
  const allHues = winAcc.flatMap((w) => w.hues);
  const hairLum = median(allLums);
  const hairSat = median(allSats);
  const hairHue = circularMean(allHues);
  const edgeDensity = totalEdges / totalSamples;

  // Hair is present when the band has real edge texture AND either reads
  // darker than the forehead skin (true for essentially all natural hair —
  // even blonde strands cast shadow) or is heavily textured. A smooth or
  // colored wall above a cropped head fails both legs.
  const darkerThanSkin = hairLum < skinLum * 0.95;
  const visible =
    edgeDensity >= 0.06 && (darkerThanSkin || edgeDensity >= 0.25);
  if (!visible) return emptyBandResult();

  const color = classifyColor(hairLum, hairSat, hairHue);

  // Per-window features → majority vote. Sparse windows (few edges) don't
  // get a vote — alignment from 2-3 edges is noise.
  const windows: HairWindowFeatures[] = [];
  for (const w of winAcc) {
    if (w.samples < MIN_WINDOW_PIXELS || w.edges < MIN_WINDOW_EDGES) continue;
    const sorted = [...w.dirBins].sort((a, b) => b - a);
    const alignment = (sorted[0] + sorted[1]) / w.edges;
    const contrast = stddev(w.lums);
    const edgeDensity = w.edges / w.samples;
    const tightness = edgeDensity * Math.min(1, contrast / 40);
    windows.push({
      alignment,
      tightness,
      contrast,
      edgeDensity,
      samples: w.samples,
      edges: w.edges,
    });
  }
  const { texture, textureConfidence } = classifyTextureFromWindows(windows);

  const confidence = clamp(
    0.3 +
      edgeDensity * 2 +
      (Math.abs(hairLum - skinLum) / 60) * 0.4,
    0,
    1,
  );

  return {
    color,
    texture,
    textureConfidence,
    confidence,
    visible: true,
    hairLum,
    windows,
  };
}

function emptyBandResult(): HairBandResult {
  return {
    color: "unknown",
    texture: "unknown",
    textureConfidence: 0,
    confidence: 0,
    visible: false,
    hairLum: 0,
    windows: [],
  };
}

// Class boundaries, calibrated against the two real fixture photos (both
// wavy): straight hair shows strongly dominant edge direction; genuine coils
// are BOTH dense/cast deep shadows (high tightness) AND scatter directions
// (low alignment) — harsh sunlight on wavy hair raises tightness but keeps
// alignment moderate, so requiring low alignment for coily stops sunlit wavy
// hair from misreading as coily. Everything in between defaults to wavy —
// the most common texture and the honest read when signals are mixed. This
// keeps a wavy person from flipping to coily/straight on photo-to-photo
// noise.
//
// Straight is set high (0.6) because real wavy hair can reach alignment
// ~0.5 in a good photo; a higher bar means wavy only misreads as straight
// when the signal is genuinely directional.
//
// Coily sits at 0.22 (not 0.2) because the real curly anchor's densest
// window reads tightness ~0.19 in a good photo — 0.2 left only 0.007 of
// margin, so a slightly harsher-light photo of the same curls would flip to
// coily. Real coily hair still clears 0.22 comfortably (synthetic reference
// reads ~0.37); sunlit wavy hair is kept out of coily by the alignment gate
// (coilyMaxAl), not this tightness gate.
//
// Exported as a single object so the boundary sweep
// (scripts/hair-boundaries.ts) reads the SAME gates production uses — a
// hardcoded copy in the sweep is how these drifted apart before.
export const HAIR_CLASSIFY_GATES = {
  straightAl: 0.6,
  curlyT: 0.12,
  coilyT: 0.22,
  coilyMaxAl: 0.4,
  curlyMaxAl: 0.5,
} as const;

/**
 * Texture by majority vote across the band's horizontal windows.
 *
 * Confidence is low when the windows disagree (unstable read) or the winning
 * label sits on a class boundary — the UI hedges to "roughly …" in that case.
 */
export function classifyTextureFromWindows(
  windows: HairWindowFeatures[],
): { texture: HairTexture; textureConfidence: number } {
  if (windows.length === 0) return { texture: "unknown", textureConfidence: 0 };

  const labels = windows.map(classifyWindow);
  const counts: Partial<Record<HairTexture, number>> = {};
  for (const l of labels) counts[l] = (counts[l] ?? 0) + 1;

  const order: HairTexture[] = ["straight", "wavy", "curly", "coily"];
  const winner =
    [...order].sort(
      (a, b) => (counts[b] ?? 0) - (counts[a] ?? 0),
    )[0] ?? "wavy";
  const agree = (counts[winner] ?? 0) / windows.length;

  // If every window disagrees, the read is unstable — hedge to the middle.
  // (With <2 valid windows the signal is too weak to trust any vote.)
  if (
    windows.length < 2 ||
    (agree < 2 / 3 && (counts[winner] ?? 0) === 1)
  ) {
    return { texture: "wavy", textureConfidence: 0.2 };
  }

  // Margin of the median window's feature from its class boundary. When
  // wavy wins but the median tightness sits AT/above the curly boundary
  // (e.g. sunlit wavy hair), margin goes negative and the confidence drops
  // below the hedge threshold — the UI then reads "roughly wavy", which is
  // honest for an ambiguous read.
  const { straightAl, curlyT, coilyT } = HAIR_CLASSIFY_GATES;
  const medTightness = median(windows.map((w) => w.tightness));
  const medAlignment = median(windows.map((w) => w.alignment));
  let margin: number;
  if (winner === "straight") margin = medAlignment - straightAl;
  else if (winner === "wavy") margin = curlyT - medTightness;
  else if (winner === "curly")
    margin = Math.min(medTightness - curlyT, coilyT - medTightness);
  else margin = medTightness - coilyT;

  const textureConfidence = clamp(
    0.3 + agree * 0.4 + clamp(margin * 3, -0.15, 0.3),
    0.15,
    0.95,
  );
  return { texture: winner, textureConfidence };
}

/**
 * Per-window texture vote. Exported so the calibration script can show the
 * TRUE window votes (the majority-vote wrapper below hedges a single window
 * to wavy, which would hide them).
 */
export function classifyWindow(f: HairWindowFeatures): HairTexture {
  const { straightAl, curlyT, coilyT, coilyMaxAl, curlyMaxAl } =
    HAIR_CLASSIFY_GATES;
  if (f.alignment >= straightAl) return "straight";
  // Coils are dense AND scatter edge directions; sunlit wavy hair is dense
  // but keeps a dominant direction, so low alignment is required here.
  if (f.tightness >= coilyT && f.alignment <= coilyMaxAl) return "coily";
  if (f.tightness >= curlyT && f.alignment <= curlyMaxAl) return "curly";
  return "wavy";
}

export function analyzeHair(
  data: ImageData,
  points: LandmarkPoint[],
): HairProfile {
  if (points.length < 468 || data.width < 2 || data.height < 2) {
    return UNKNOWN_HAIR;
  }
  const { width, height } = data;

  // Face bounding box (normalized 0..1 → pixels).
  let minX = 1;
  let maxX = 0;
  let minY = 1;
  let maxY = 0;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const faceW = Math.max(1, (maxX - minX) * width);
  const faceH = Math.max(1, (maxY - minY) * height);
  const cx = ((minX + maxX) / 2) * width;
  const hairline = minY * height;

  // Hair band: a strip above the hairline (plus a sliver below it so a
  // slightly-shifted hairline still lands inside), spanning the face width.
  const rect: HairBandRect = {
    top: Math.max(0, hairline - 0.45 * faceH),
    bottom: Math.min(height - 1, hairline + 0.06 * faceH),
    left: Math.max(0, Math.round(cx - 0.5 * faceW)),
    right: Math.min(width - 1, Math.round(cx + 0.5 * faceW)),
  };

  // Forehead skin reference (for hair-vs-skin separation).
  const skinLum = medianLuminance(
    data,
    Math.max(0, Math.round(hairline + 0.06 * faceH)),
    Math.min(height - 1, Math.round(hairline + 0.16 * faceH)),
    Math.max(0, Math.round(cx - 0.28 * faceW)),
    Math.min(width - 1, Math.round(cx + 0.28 * faceW)),
  );

  const band = analyzeHairBand(data, rect, skinLum);
  if (!band.visible) return UNKNOWN_HAIR;

  return {
    visible: true,
    color: band.color,
    texture: band.texture,
    confidence: band.confidence,
    textureConfidence: band.textureConfidence,
  };
}

// ---------------------------------------------------------------------------
// Color / texture classifiers
// ---------------------------------------------------------------------------

function classifyColor(lum: number, sat: number, hue: number): HairColor {
  // Auburn/red first: hue is decisive regardless of lightness.
  if (sat > 0.25 && (hue < 25 || hue > 335)) return "auburn";
  if (sat < 0.12 && lum >= 100) return "gray";
  if (lum < 40) return "black";
  if (lum < 75) return "dark-brown";
  if (lum < 115) return "brown";
  if (lum < 155) return "light-brown";
  return "blonde";
}

// ---------------------------------------------------------------------------
// Hairstyle advice: face shape × hair read
// ---------------------------------------------------------------------------

const SHAPE_ADVICE: Record<FaceShape, string[]> = {
  oval: [
    "Most styles work — experiment with texture on top and a clean taper on the sides.",
    "Avoid heavy fringes that cover the forehead; keep the brows visible.",
    "Side parts or quiffs add gentle structure without overwhelming the shape.",
  ],
  square: [
    "Soften the angles with a side-swept fringe or wavy texture on top.",
    "Keep fades moderate — very short sides emphasize the jawline.",
    "Avoid blunt, straight-across bangs that mirror the jawline.",
  ],
  round: [
    "Add height on top — a textured quiff, faux-hawk, or vertical pomp.",
    "Keep sides tighter than the top to elongate the face.",
    "Avoid rounded bangs and full bowl cuts that mirror the round shape.",
  ],
  heart: [
    "Side-parted styles with some weight on the sides balance a wider forehead.",
    "Avoid severe slicked-back looks that exaggerate the V-shape.",
    "Longer hair on top with a softer fringe works well.",
  ],
  oblong: [
    "Add width on the sides — textured crops, side-swept styles, or a fringe.",
    "Avoid very tall styles that elongate the face further.",
    "Mid-length cuts with horizontal volume balance the proportions.",
  ],
  diamond: [
    "Side-swept fringes soften the narrow forehead.",
    "Layered styles on the jaw add width at the chin.",
    "Avoid styles that hug the cheekbones — let the hair add width elsewhere.",
  ],
};

const TEXTURE_ADVICE: Record<Exclude<HairTexture, "unknown">, string> = {
  straight:
    "Straight hair reads sleek — a textured crop or sea-salt spray adds the volume your face shape needs.",
  wavy:
    "Lean into the natural wave — a layered cut lets the wave sit with your face proportions.",
  curly:
    "Keep curls defined with a curl cream — rounded volume balances the face.",
  coily:
    "A taper or fade on the sides frames the face while the coil on top adds height.",
};

/** Style recommendations combining face shape + (when visible) hair read. */
export function hairStyleAdvice(
  shape: FaceShape,
  hair: HairProfile,
): string[] {
  const shapeAdvice = SHAPE_ADVICE[shape];
  if (!hair.visible) return shapeAdvice.slice(0, 3);
  const textureLine =
    hair.texture !== "unknown" ? TEXTURE_ADVICE[hair.texture] : undefined;
  return textureLine
    ? [textureLine, ...shapeAdvice.slice(0, 2)]
    : shapeAdvice.slice(0, 3);
}

// ---------------------------------------------------------------------------
// Pixel helpers
// ---------------------------------------------------------------------------

function luminanceAt(data: ImageData, x: number, y: number): number {
  const { width } = data;
  const clampedX = clamp(x, 0, width - 1);
  const clampedY = clamp(y, 0, data.height - 1);
  const i = (clampedY * width + clampedX) * 4;
  const { data: px } = data;
  return 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
}

function medianLuminance(
  data: ImageData,
  y0: number,
  y1: number,
  x0: number,
  x1: number,
): number {
  const vals: number[] = [];
  for (let y = y0; y <= y1; y += 2) {
    for (let x = x0; x <= x1; x += 2) {
      vals.push(luminanceAt(data, x, y));
    }
  }
  return vals.length > 0 ? median(vals) : 128;
}

function median(vals: number[]): number {
  if (vals.length === 0) return 0;
  const sorted = [...vals].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function stddev(vals: number[]): number {
  if (vals.length === 0) return 0;
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const variance =
    vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length;
  return Math.sqrt(variance);
}

function circularMean(hues: number[]): number {
  if (hues.length === 0) return 0;
  let sinSum = 0;
  let cosSum = 0;
  for (const h of hues) {
    const rad = (h * Math.PI) / 180;
    sinSum += Math.sin(rad);
    cosSum += Math.cos(rad);
  }
  const deg = (Math.atan2(sinSum, cosSum) * 180) / Math.PI;
  return deg < 0 ? deg + 360 : deg;
}

function rgbToHsl(
  px: Uint8ClampedArray,
  i: number,
): { h: number; s: number; l: number } {
  const r = px[i] / 255;
  const g = px[i + 1] / 255;
  const b = px[i + 2] / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  switch (max) {
    case r:
      h = (g - b) / d + (g < b ? 6 : 0);
      break;
    case g:
      h = (b - r) / d + 2;
      break;
    default:
      h = (r - g) / d + 4;
  }
  return { h: h * 60, s, l };
}
