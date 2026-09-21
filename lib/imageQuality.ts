// Image quality assessment using only canvas pixel data.
// Cheap heuristics: brightness, contrast (stddev), evenness (left/right/quad
// brightness delta), and a Laplacian-variance proxy for sharpness.
// Optional face box: when provided, a localized-redness proxy is computed
// from pixels inside the face only (see computeRedness below).

import type { LightQualityReport, ImageChecks, LandmarkPoint } from "@/types/analysis";

/** Tighter box around the face landmarks, in pixel coords. */
function faceBox(
  points: LandmarkPoint[],
  width: number,
  height: number,
): { x0: number; y0: number; x1: number; y1: number } | null {
  if (!points || points.length < 468) return null;
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
  // Shrink 12% per side to stay on facial skin and off the background.
  const shrinkX = (maxX - minX) * 0.12;
  const shrinkY = (maxY - minY) * 0.12;
  return {
    x0: Math.max(0, Math.floor((minX + shrinkX) * width)),
    y0: Math.max(0, Math.floor((minY + shrinkY) * height)),
    x1: Math.min(width - 1, Math.ceil((maxX - shrinkX) * width)),
    y1: Math.min(height - 1, Math.ceil((maxY - shrinkY) * height)),
  };
}

/**
 * Localized-redness proxy (0..1) from pixels inside the face box.
 *
 * For each sampled pixel: redExcess = (r - (g+b)/2) / (r+g+b), a
 * tone-and-exposure independent measure of how red that patch reads.
 * We then compare the 90th-percentile patches against the face's own median:
 * a large gap means localized hot spots (flushing, irritation, breakout
 * edges) rather than an all-over complexion. Within-face dispersion cancels
 * skin tone and lighting color, which is the whole point.
 */
export function computeRedness(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  points: LandmarkPoint[],
): number {
  const box = faceBox(points, width, height);
  if (!box) return 0;

  const { x0, y0, x1, y1 } = box;
  if (x1 - x0 < 24 || y1 - y0 < 24) return 0;

  // Coarse sample (every 3rd px in both axes) — plenty of signal for a
  // percentile read, and cheap even on full-res frames.
  const excess: number[] = [];
  for (let y = y0; y <= y1; y += 3) {
    for (let x = x0; x <= x1; x += 3) {
      const i = (y * width + x) * 4;
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const total = r + g + b;
      if (total < 40) continue; // skip deep shadow pixels
      excess.push((r - (g + b) / 2) / total);
    }
  }
  if (excess.length < 200) return 0; // not enough usable face pixels

  excess.sort((a, b) => a - b);
  const percentile = (p: number): number =>
    excess[Math.min(excess.length - 1, Math.floor(p * excess.length))];

  const median = percentile(0.5);
  const hot = percentile(0.9);
  // Gap between the reddest decile and the face's own baseline. Clamp at 0 so
  // an unusually even read can't go negative.
  return Math.max(0, Math.min(1, (hot - median) * 5));
}

export function computeLightQuality(
  data: ImageData,
  points?: LandmarkPoint[],
): LightQualityReport {
  const { data: pixels, width, height } = data;
  const halfW = width / 2;
  const halfH = height / 2;

  // Single pass: collect mean luminance, sumSq for variance, and per-quadrant
  // sums. Carrying (x, y) on each sample is what lets quadrant assignment
  // work correctly (the previous implementation reconstructed coords from
  // sample index with the wrong formula, putting every sample in one quadrant
  // and forcing evenness to ~0 for any image with non-trivial brightness).
  let sum = 0;
  let sumSq = 0;
  let count = 0;
  const quadSum = [0, 0, 0, 0];
  const quadCount = [0, 0, 0, 0];
  for (let y = 0; y < height; y += 4) {
    for (let x = 0; x < width; x += 4) {
      const i = (y * width + x) * 4;
      const lum =
        0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2];
      sum += lum;
      sumSq += lum * lum;
      count++;
      const idx =
        (x < halfW ? 0 : 1) + (y < halfH ? 0 : 2);
      quadSum[idx] += lum;
      quadCount[idx]++;
    }
  }

  const mean = count > 0 ? sum / count : 0;
  const variance = count > 0 ? sumSq / count - mean * mean : 0;
  const stddev = Math.sqrt(Math.max(0, variance));
  const contrast = Math.min(1, stddev / 80);

  let quadMax = -Infinity;
  let quadMin = Infinity;
  for (let q = 0; q < 4; q++) {
    const m = quadSum[q] / Math.max(1, quadCount[q]);
    if (m > quadMax) quadMax = m;
    if (m < quadMin) quadMin = m;
  }
  const spread = quadMax - quadMin;
  const evenness = clamp(1 - spread / 80, 0, 1);

  const sharpness = laplacianVariance(pixels, width, height);
  // Normalize sharpness so a 4x downsampled 1024x1024 reference sharp image
  // scores ~1.0. Calibrated empirically against in-app test photos.
  const sharpnessNorm = clamp(sharpness / LAPLACIAN_REFERENCE, 0, 1);

  // Redness needs the face landmarks — only computed when they're available
  // (absent on legacy restored reports and on no-face frames, both fine: the
  // field is optional).
  const redness =
    points && points.length >= 468
      ? computeRedness(pixels, width, height, points)
      : 0;

  return {
    brightness: clamp(mean, 0, 255),
    contrast,
    evenness,
    sharpness: sharpnessNorm,
    redness,
  };
}

const LAPLACIAN_REFERENCE = 500;

export function assessImageQuality(data: ImageData, faceFound: boolean): ImageChecks {
  const light = computeLightQuality(data);
  const reasons: string[] = [];

  if (!faceFound) reasons.push("No face detected");
  if (light.brightness < 60) reasons.push("Image is too dark");
  if (light.brightness > 220) reasons.push("Image is overexposed");
  if (light.evenness < 0.55) reasons.push("Lighting is uneven across the face");
  if (light.sharpness < 0.15) reasons.push("Image is blurry or low-resolution");
  if (data.width < 320 || data.height < 320) reasons.push("Image resolution is too low");

  if (reasons.length === 0) return { quality: "good", hasFace: faceFound };
  if (faceFound && reasons.length <= 1) return { quality: "ok", hasFace: true, reason: reasons[0] };
  return { quality: "poor", hasFace: faceFound, reason: reasons.join("; ") };
}

function laplacianVariance(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): number {
  let sum = 0;
  let sumSq = 0;
  let count = 0;
  for (let y = 1; y < height - 1; y += 2) {
    for (let x = 1; x < width - 1; x += 2) {
      const i = (y * width + x) * 4;
      const center = 0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2];
      const up =
        0.2126 * pixels[((y - 1) * width + x) * 4] +
        0.7152 * pixels[((y - 1) * width + x) * 4 + 1] +
        0.0722 * pixels[((y - 1) * width + x) * 4 + 2];
      const down =
        0.2126 * pixels[((y + 1) * width + x) * 4] +
        0.7152 * pixels[((y + 1) * width + x) * 4 + 1] +
        0.0722 * pixels[((y + 1) * width + x) * 4 + 2];
      const left =
        0.2126 * pixels[(y * width + (x - 1)) * 4] +
        0.7152 * pixels[(y * width + (x - 1)) * 4 + 1] +
        0.0722 * pixels[(y * width + (x - 1)) * 4 + 2];
      const right =
        0.2126 * pixels[(y * width + (x + 1)) * 4] +
        0.7152 * pixels[(y * width + (x + 1)) * 4 + 1] +
        0.0722 * pixels[(y * width + (x + 1)) * 4 + 2];
      const lap = 4 * center - up - down - left - right;
      sum += lap;
      sumSq += lap * lap;
      count++;
    }
  }
  if (count === 0) return 0;
  const mean = sum / count;
  return sumSq / count - mean * mean;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
