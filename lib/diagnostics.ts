// Image-quality diagnostics shared between the CLI validator and the
// /test-gallery page. Each reason emitted by analyze→assessImageQuality maps
// to a single-line, actionable fix that the user can apply before
// re-uploading. Reasons are prose strings (e.g. "Image is too dark") that
// come from assessImageQuality in lib/imageQuality.

export const IMAGE_QUALITY_REASONS = [
  "No face detected",
  "Image is too dark",
  "Image is overexposed",
  "Lighting is uneven across the face",
  "Image is blurry or low-resolution",
  "Image resolution is too low",
] as const;

export type ImageQualityReason = (typeof IMAGE_QUALITY_REASONS)[number];

// Single-line actionable fixes keyed on the exact reason string from
// assessImageQuality. Kept conversational (reads like advice from a friend)
// rather than prescriptive.
export const IMAGE_QUALITY_TIPS: Record<ImageQualityReason, string> = {
  "No face detected":
    "Center your face in the frame and look directly at the camera — try straight-on, no sunglasses, no heavy shadows over the eyes.",
  "Image is too dark":
    "Move to a brighter room or face a window for natural light. Even an overcast day outdoors reads better than a dim indoor shot.",
  "Image is overexposed":
    "Step back from direct sunlight or bright lamps — diffused light (an open window with a sheer curtain, a shaded porch) reads cleaner.",
  "Lighting is uneven across the face":
    "Position the light source above and slightly in front of you so it falls evenly across the whole face, not just one side.",
  "Image is blurry or low-resolution":
    "Hold the camera steady (lean your elbow on a table) and use a higher resolution. Tap to focus on your eyes before taking the shot.",
  "Image resolution is too low":
    "Use a photo at least 320×320 px — a modern phone's front camera produces 1200×1600 by default, which is plenty.",
};

/**
 * Split a chained reason (the way assessImageQuality joins multiple issues
 * with "; ") into individual keys, look up their fixes, and drop unknown
 * substrings. Returns the fixes in the order they were reported.
 */
export function tipsForReason(reason: string | undefined): string[] {
  if (!reason) return [];
  const parts = reason.split(";").map((r) => r.trim()).filter(Boolean);
  const out: string[] = [];
  for (const part of parts) {
    const tip = (IMAGE_QUALITY_TIPS as Record<string, string>)[part];
    if (tip) out.push(tip);
  }
  return out;
}
