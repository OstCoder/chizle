// Scan-driven grooming reads: pixel sampling of beard / brow / neckline
// regions from the latest scan, plus deterministic rule-based tips, product
// recommendations, and a beard try-on descriptor. All client-side.
//
// These are photographic heuristics, not trichology — every read carries a
// confidence number and the UI hedges accordingly.

import type { AnalysisReport, LandmarkPoint } from "@/types/analysis";
import { LM, avgPoint, getPoint } from "./landmarks";

export interface AreaRead {
  /** Mean pixel luminance of the sampled region, 0..255. */
  luminance: number;
  /** 0..1 — how much signal the region actually contained. */
  confidence: number;
  /** Region sampled, normalized image coords (for optional debug overlay). */
  samples: number;
}

export interface GroomingReads {
  beard: AreaRead;
  brow: AreaRead;
  /** Bridge between the brows — high vs brow luminance suggests a unibrow. */
  glabella: AreaRead;
  neckline: AreaRead;
}

export interface GroomingTip {
  id: string;
  title: string;
  detail: string;
}

export interface ProductRec {
  name: string;
  category: string;
  reason: string;
}

export interface BeardStyle {
  name: string;
  rationale: string;
  upkeep: string;
}

// ---------------------------------------------------------------------------
// Pixel sampling
// ---------------------------------------------------------------------------

function lumAt(data: ImageData, x: number, y: number): number | null {
  const px = Math.round(x * (data.width - 1));
  const py = Math.round(y * (data.height - 1));
  if (px < 0 || py < 0 || px >= data.width || py >= data.height) return null;
  const i = (py * data.width + px) * 4;
  return (
    0.2126 * data.data[i] + 0.7152 * data.data[i + 1] + 0.0722 * data.data[i + 2]
  );
}

/** Mean luminance over an ellipse (normalized coords), sampled on a grid. */
function sampleEllipse(
  data: ImageData,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
): AreaRead {
  let sum = 0;
  let n = 0;
  for (let gy = -2; gy <= 2; gy++) {
    for (let gx = -2; gx <= 2; gx++) {
      const x = cx + (gx / 2) * rx;
      const y = cy + (gy / 2) * ry;
      if ((gx / 2) ** 2 + (gy / 2) ** 2 > 1) continue;
      const l = lumAt(data, x, y);
      if (l !== null) {
        sum += l;
        n++;
      }
    }
  }
  return {
    luminance: n ? sum / n : 0,
    confidence: n / 25,
    samples: n,
  };
}

/**
 * Reads grooming-relevant regions from the latest scan's pixels + landmarks.
 * Returns null when there is no usable scan (no landmarks persisted or a
 * side-angle shot, where region geometry is unreliable).
 */
export function readGrooming(
  report: AnalysisReport | null,
  landmarks: LandmarkPoint[] | null,
  image: string | null,
): Promise<GroomingReads | null> {
  return (async () => {
    if (!report || !landmarks || landmarks.length < 468) return null;
    if (report.sideAngle === true || report.angle !== "front") return null;
    if (!image || typeof window === "undefined") return null;

    const img = new Image();
    img.src = image;
    try {
      await img.decode();
    } catch {
      return null;
    }
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 512 / Math.max(img.naturalWidth, img.naturalHeight));
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const faceLength = Math.abs(
      getPoint(landmarks, LM.CHIN).y - getPoint(landmarks, LM.FOREHEAD_TOP).y,
    );
    const mouth = avgPoint(landmarks, [LM.MOUTH_LEFT, LM.MOUTH_RIGHT]);
    const chin = getPoint(landmarks, LM.CHIN);

    // Beard band: between the lower lip and the jaw, widest at the gonions.
    const beardCy = (getPoint(landmarks, LM.LOWER_LIP_TOP).y + chin.y) / 2;
    const beardCx = chin.x;
    const beardRx = Math.abs(
      getPoint(landmarks, LM.RIGHT_GONION).x - getPoint(landmarks, LM.LEFT_GONION).x,
    ) / 2.2;
    const beard = sampleEllipse(data, beardCx, beardCy, beardRx, faceLength * 0.09);

    // Brow band: a thin strip just above each brow, plus the glabella
    // (the patch between the brows) for the unibrow check.
    const browDy = faceLength * 0.035;
    const leftBrow = sampleEllipse(
      data,
      getPoint(landmarks, LM.LEFT_BROW_OUTER).x,
      getPoint(landmarks, LM.LEFT_BROW_OUTER).y - browDy,
      faceLength * 0.09,
      faceLength * 0.02,
    );
    const rightBrow = sampleEllipse(
      data,
      getPoint(landmarks, LM.RIGHT_BROW_OUTER).x,
      getPoint(landmarks, LM.RIGHT_BROW_OUTER).y - browDy,
      faceLength * 0.09,
      faceLength * 0.02,
    );
    const brow: AreaRead = {
      luminance: (leftBrow.luminance + rightBrow.luminance) / 2,
      confidence: Math.min(leftBrow.confidence, rightBrow.confidence),
      samples: leftBrow.samples + rightBrow.samples,
    };
    const bridge = getPoint(landmarks, LM.NOSE_BRIDGE);
    const glabella = sampleEllipse(
      data,
      bridge.x,
      bridge.y - browDy,
      faceLength * 0.06,
      faceLength * 0.02,
    );

    // Neckline: center of the neck just below the chin.
    const neckline = sampleEllipse(
      data,
      chin.x,
      chin.y + faceLength * 0.14,
      faceLength * 0.14,
      faceLength * 0.05,
    );

    return { beard, brow, glabella, neckline };
  })();
}

// ---------------------------------------------------------------------------
// Tips — deterministic rules over the reads
// ---------------------------------------------------------------------------

export function deriveTips(
  reads: GroomingReads | null,
  report: AnalysisReport | null,
): GroomingTip[] {
  const tips: GroomingTip[] = [];
  if (!reads) {
    tips.push({
      id: "no-scan",
      title: "Run a front-facing scan first",
      detail:
        "Grooming reads come from your latest scan's pixels — beard coverage, brow definition, neckline. Analyze a front-facing photo and this card fills in.",
    });
    return tips;
  }

  // Beard presence: facial hair reads dark against skin.
  const beardDensity = reads.beard.luminance;
  if (beardDensity > 0 && beardDensity < 110 && reads.beard.confidence > 0.4) {
    tips.push({
      id: "beard-define",
      title: "Define the beard line",
      detail:
        "Your beard band reads dense. A crisp line along the upper cheek and a clean neckline (two fingers above the Adam's apple) reads sharper than letting it fade.",
    });
  } else if (beardDensity >= 110 && reads.beard.confidence > 0.4) {
    tips.push({
      id: "beard-stubble",
      title: "Stubble could sharpen the jaw",
      detail:
        "The beard region reads light — clean-shaven or very light stubble. A short, even stubble (1–3 mm) adds jaw definition without maintenance overhead.",
    });
  }

  // Neckline: neck reading close to the beard band means the line is blurred.
  if (
    reads.neckline.confidence > 0.4 &&
    Math.abs(reads.neckline.luminance - beardDensity) < 24 &&
    beardDensity < 130
  ) {
    tips.push({
      id: "neckline",
      title: "Clean up the neckline",
      detail:
        "The transition from beard to neck reads soft. Shave everything below the two-finger line above your Adam's apple — it visually lengthens the face.",
    });
  }

  // Unibrow: bridge patch reads as dark as the brows themselves.
  if (
    reads.glabella.confidence > 0.4 &&
    reads.brow.luminance > 0 &&
    reads.glabella.luminance < reads.brow.luminance * 0.82
  ) {
    tips.push({
      id: "unibrow",
      title: "Tidy between the brows",
      detail:
        "The bridge between your brows reads dark. A quick tweeze or trim of just that middle strip keeps the brows strong without thinning them.",
    });
  }

  // Scan-derived context: posture and framing affect how grooming reads.
  if (report && report.posture.chinToCamera < 0.7) {
    tips.push({
      id: "chin-camera",
      title: "Chin reads low in the scan",
      detail:
        "Your chin level was flagged in the scan. A defined jawline + beard line lands better once the head stays level — try the chin-tuck habit in Habits.",
    });
  }

  if (tips.length === 0) {
    tips.push({
      id: "clean",
      title: "Reads clean",
      detail:
        "Beard line, brows, and neckline all sampled within normal ranges. Keep the current routine and re-scan after any change.",
    });
  }
  return tips;
}

// ---------------------------------------------------------------------------
// Product recommendations (static catalog matched to reads + face shape)
// ---------------------------------------------------------------------------

export function recommendProducts(
  reads: GroomingReads | null,
  report: AnalysisReport | null,
): ProductRec[] {
  const recs: ProductRec[] = [];
  const shape = report?.shape ?? "oval";
  const beardDense = !!reads && reads.beard.luminance < 110 && reads.beard.confidence > 0.4;

  if (beardDense) {
    recs.push({
      name: "Beard oil (jojoba base)",
      category: "Beard",
      reason: "Your beard band reads dense — oil keeps the coarse hairs soft and stops the flyaways that blur the line.",
    });
    recs.push({
      name: "Beard trimmer with length guard (1–3 mm)",
      category: "Tool",
      reason: "Maintaining an even stubble length beats trimming by eye — guards keep the cheek line repeatable.",
    });
  } else {
    recs.push({
      name: "Aftershave balm (alcohol-free)",
      category: "Skin",
      reason: "You read clean-shaven — a balm calms the skin after shaving without the burn that dries it out.",
    });
  }

  if (shape === "round" || shape === "square") {
    recs.push({
      name: "Matte clay",
      category: "Hair",
      reason: `${cap(shape)} faces gain from height on top — a matte clay lifts the style without the shine that widens the face.`,
    });
  } else {
    recs.push({
      name: "Sea-salt spray",
      category: "Hair",
      reason: "Light texture spray adds volume on top, which balances your face length well.",
    });
  }

  recs.push({
    name: "Brow comb + small trimmer",
    category: "Brows",
    reason: "Weekly 30-second tidy-up of the brow tops and the bridge keeps the eye area sharp between scans.",
  });
  return recs.slice(0, 4);
}

// ---------------------------------------------------------------------------
// Beard try-on — descriptive previews of what each style would do
// ---------------------------------------------------------------------------

export function beardTryOnOptions(
  reads: GroomingReads | null,
  report: AnalysisReport | null,
): BeardStyle[] {
  const shape = report?.shape ?? "oval";
  const dense = !!reads && reads.beard.luminance < 110 && reads.beard.confidence > 0.4;
  return [
    {
      name: "Clean shaven",
      rationale: dense
        ? "You have the density to pull it off — shows the jawline as-is, no framing. Best if the beard line is your weakest edge."
        : "Your natural state — zero upkeep and the skin tone reads evenest.",
      upkeep: "Shave every 1–2 days",
    },
    {
      name: "Designer stubble (2–3 mm)",
      rationale:
        shape === "round" || shape === "square"
          ? "Even stubble sharpens the lower third of a rounder face and adds edge definition without length."
          : "Even stubble fills the chin visually and frames the mouth — the lowest-effort style that changes a read.",
      upkeep: "Trim every 2–3 days with a guard",
    },
    {
      name: "Short full beard",
      rationale: dense
        ? "Your density supports it — a short full beard squares the jaw and balances midface length."
        : "Needs moderate density; patchy growth at this length reads unkempt, so grow in before committing.",
      upkeep: "Shape the neckline weekly, oil daily",
    },
  ];
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
