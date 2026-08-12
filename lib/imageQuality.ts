// Image quality assessment using only canvas pixel data.
// Cheap heuristics: brightness, contrast (stddev), evenness (left/right/quad
// brightness delta), and a Laplacian-variance proxy for sharpness.

import type { LightQualityReport, ImageChecks } from "@/types/analysis";

export function computeLightQuality(data: ImageData): LightQualityReport {
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

  return {
    brightness: clamp(mean, 0, 255),
    contrast,
    evenness,
    sharpness: sharpnessNorm,
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
