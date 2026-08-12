// Dating profile scorecard.
// Three buckets (0..10), plus an overall and a verdict (primary / secondary /
// fix / reframe) with actionable tips.
//
// Two scoring modes:
//  - "app"  — the photo is going on a dating app. Lighting, sharpness, and
//    framing matter; tips include in-app filters and technical fixes.
//  - "irl"  — the photo is just a first impression of you in person. Lighting
//    is irrelevant; the buckets become grooming (hair, jawline, brows) and
//    presence (posture, expression energy).

import type {
  AnalysisReport,
  ScorecardBucket,
  ScorecardMode,
  ScorecardReport,
  ScorecardVerdict,
} from "@/types/analysis";
import { hairTextureLabel } from "./hair";
import { clamp, toBand } from "./utils";

export function scorecard(
  report: AnalysisReport,
  mode: ScorecardMode = "app",
): ScorecardReport {
  const approachability = scoreApproachability(report);
  const photoQuality =
    mode === "app" ? scorePhotoQuality(report) : scoreGrooming(report);
  const style = mode === "app" ? scoreStyle(report) : scorePresence(report);
  const overall = round(
    (approachability.score + photoQuality.score + style.score) / 3,
  );
  const verdict = decideVerdict(overall, approachability, photoQuality);
  const tips = buildTips(
    report,
    approachability,
    photoQuality,
    style,
    mode,
    verdict.bucket,
  );

  return {
    overall,
    mode,
    buckets: { approachability, photoQuality, style },
    verdict,
    tips,
  };
}

function scoreApproachability(r: AnalysisReport): ScorecardBucket {
  const notes: string[] = [];
  let total = 0;

  // Smile & expression
  const smileScore = r.smile.detected ? 6 + (r.smile.score / 100) * 4 : 5;
  total += smileScore;
  notes.push(
    r.smile.detected
      ? `Smile detected — ${r.smile.score}/100 lift, reads ${r.smile.score > 70 ? "warm" : "subtle"}.`
      : "Neutral expression — a half-smile would add warmth.",
  );

  // Eye openness & gaze
  const eyeAvg = (r.eyes.leftOpen + r.eyes.rightOpen) / 2;
  const gazeScore = 1 + Math.min(1, eyeAvg / 0.32) * 2 + r.eyes.gazeForward * 1;
  total += gazeScore;
  notes.push(
    eyeAvg >= 0.28
      ? "Eyes are open and engaged — good eye contact."
      : "Eyes look slightly squinted — practice a relaxed open eye before the shot.",
  );

  // Posture / chin alignment
  const postureScore = 1 + r.posture.chinToCamera * 2;
  total += postureScore;
  notes.push(
    r.posture.chinToCamera > 0.75
      ? "Chin level reads confident."
      : "Chin could be closer to eye level for a more confident read.",
  );

  const score = round(clamp(total, 0, 10));
  return { label: "Approachability", score, band: toBand(score), notes };
}

function scorePhotoQuality(r: AnalysisReport): ScorecardBucket {
  const notes: string[] = [];
  let total = 0;

  const brightScore = bell(r.light.brightness, 155, 50) * 4;
  total += brightScore;
  notes.push(
    r.light.brightness >= 130 && r.light.brightness <= 180
      ? `Exposure looks balanced (${Math.round(r.light.brightness)}/255).`
      : `Exposure is ${r.light.brightness < 130 ? "dim" : "a bit hot"} — aim for a window-lit 130–180.`,
  );

  const evenScore = r.light.evenness * 3;
  total += evenScore;
  notes.push(
    r.light.evenness > 0.75
      ? "Lighting is even across the face."
      : "Lighting has visible falloff — try a single soft key light with bounce.",
  );

  const sharpScore = r.light.sharpness * 3;
  total += sharpScore;
  notes.push(
    r.light.sharpness > 0.45
      ? "Sharpness is good."
      : "Image looks soft — pinch-to-zoom when shooting, or use a recent phone in good light.",
  );

  const score = round(clamp(total, 0, 10));
  return { label: "Photo Quality", score, band: toBand(score), notes };
}

// IRL replacement for photo quality: grooming signals we can actually read
// from the face — hair, jawline, brows, symmetry. No lighting anywhere.
// Baseline is lower than the app buckets so a genuinely ungroomed read still
// scores low (vs. always landing in "good").
function scoreGrooming(r: AnalysisReport): ScorecardBucket {
  const notes: string[] = [];
  let total = 4;

  // Hair read
  if (r.hair?.visible) {
    total += 2;
    notes.push(
      `Hair reads as ${hairTextureLabel(r.hair).toLowerCase()} ${r.hair.color}, visible in frame — a styled look reads immediately.`,
    );
  } else {
    notes.push(
      "Hair isn't clearly visible in this shot — a clean, styled cut matters in person.",
    );
  }

  // Jawline definition
  const jawScore = bell(r.ratios.jawlineAngle, 100, 30) * 2;
  total += jawScore;
  notes.push(
    r.ratios.jawlineAngle <= 115
      ? `Jawline reads defined (~${Math.round(r.ratios.jawlineAngle)}°).`
      : `Jawline reads soft (~${Math.round(r.ratios.jawlineAngle)}°) — stubble or a trim adds structure.`,
  );

  // Brows relaxed + groomed (blendshape composite, low = calm)
  const browScore =
    (r.eyes.browInnerUp ?? 0) +
    (r.eyes.browOuterUpLeft ?? 0) +
    (r.eyes.browOuterUpRight ?? 0);
  total += browScore < 1.4 ? 1 : 0;
  notes.push(
    browScore < 1.4
      ? "Brows read relaxed and calm."
      : "Brows read raised — grooming and relaxation make a big difference in person.",
  );

  // Symmetry in grooming context
  total += r.symmetry.overall > 78 ? 1 : 0;
  notes.push(
    r.symmetry.overall > 78
      ? "Symmetry reads strong."
      : "A slight turn toward your good side helps.",
  );

  const score = round(clamp(total, 0, 10));
  return { label: "Grooming & Style", score, band: toBand(score), notes };
}

function scoreStyle(r: AnalysisReport): ScorecardBucket {
  const notes: string[] = [];
  let total = 5; // baseline since we can't see clothing here

  // Frame composition proxy: cheekbone-to-image ratio
  const frameScore = bell(r.ratios.cheekboneWidth, 0.32, 0.12) * 3;
  total += frameScore;
  notes.push(
    r.ratios.cheekboneWidth > 0.45
      ? "Face is large in the frame — consider stepping back for a more inviting composition."
      : "Framing reads well.",
  );

  // Symmetry in style context
  const symScore = r.symmetry.overall > 78 ? 2 : 1;
  total += symScore;
  notes.push(
    r.symmetry.overall > 78
      ? "Symmetry reads strong — a slight 5-10° turn toward your good side is enough."
      : "A slight turn toward your good side will help.",
  );

  const score = round(clamp(total, 0, 10));
  return { label: "Style & Grooming", score, band: toBand(score), notes };
}

// IRL replacement for style: presence & energy — how you carry yourself.
// No lighting here either; baseline 4 so a flat read still lands low.
function scorePresence(r: AnalysisReport): ScorecardBucket {
  const notes: string[] = [];
  let total = 4;

  // Posture — chin level + head tilt
  const postureScore = r.posture.chinToCamera * 2;
  total += postureScore;
  notes.push(
    r.posture.chinToCamera > 0.75
      ? "Head is level and confident."
      : "Head tilts in the frame — leveling it reads as more assured.",
  );

  const tilt = Math.abs(r.posture.headTiltDeg);
  total += tilt <= 4 ? 1 : 0;
  notes.push(
    tilt <= 4
      ? "Posture reads relaxed and open."
      : "Head tilt is noticeable — square your shoulders before the next take.",
  );

  // Expression energy
  const smileEnergy = r.smile.detected ? 1 + (r.smile.score / 100) * 2 : 0;
  total += smileEnergy;
  notes.push(
    r.smile.detected
      ? "Warm smile present — the strongest presence signal."
      : "A relaxed half-smile would add energy to the read.",
  );

  const score = round(clamp(total, 0, 10));
  return { label: "Presence", score, band: toBand(score), notes };
}

function decideVerdict(
  overall: number,
  approachability: ScorecardBucket,
  photoQuality: ScorecardBucket,
): ScorecardVerdict {
  const best = Math.max(approachability.score, photoQuality.score);
  if (overall >= 8) {
    return {
      bucket: "primary",
      headline: "Strong primary photo",
      reason: `Overall ${overall}/10 across the board. Use this as your lead image.`,
    };
  }
  if (overall >= 6.5) {
    return {
      bucket: "secondary",
      headline: "Use as a secondary shot",
      reason: `Overall ${overall}/10. Good companion to a stronger front-facing photo.`,
    };
  }
  if (best >= 6) {
    return {
      bucket: "fix",
      headline: "Save it — one targeted fix would unlock it",
      reason: `Best bucket is ${best}/10. A targeted change could push this to primary.`,
    };
  }
  return {
    bucket: "reframe",
    headline: "Recapture with one targeted change",
    reason: `Overall ${overall}/10. Try again with a relaxed half-smile and better posture.`,
  };
}

function buildTips(
  r: AnalysisReport,
  a: ScorecardBucket,
  p: ScorecardBucket,
  s: ScorecardBucket,
  mode: ScorecardMode,
  verdict: ScorecardVerdict["bucket"],
): string[] {
  const tips: string[] = [];
  const isPrimary = verdict === "primary";

  // Mode-level strategy: always worth saying, regardless of score.
  if (mode === "app") {
    tips.push("Lead with your strongest photo — most matches decide in the first swipe.");
    tips.push("Keep the set varied: one clear face shot, one full-body, one doing something.");
  } else {
    tips.push(
      isPrimary
        ? "A clean, confident look is your handshake — it lands before you say a word."
        : "A clean, confident look is your handshake — one polished upgrade would make it your strongest.",
    );
    tips.push("Match the vibe to the occasion: polished for a date, relaxed for a coffee meet.");
  }

  // ---- Approachability (smile / eyes / chin) -------------------------------
  if (a.score < 4.5) {
    if (!r.smile.detected)
      tips.push(
        mode === "app"
          ? "Try a half-smile and squint slightly — it brings the eyes in and warms the whole read."
          : "Practice a relaxed half-smile in the mirror — warmth is your strongest in-person signal.",
      );
    if (r.posture.chinToCamera < 0.7)
      tips.push(
        mode === "app"
          ? "Bring the camera to eye level and push the chin forward a touch."
          : "Keep the chin level when you speak; it reads as confidence across the room.",
      );
    if (Math.abs(r.posture.headTiltDeg) > 4)
      tips.push("Square your head to the camera; tilt only the eyes, not the face.");
  } else if (a.score < 6.5) {
    tips.push(
      "Your expression is close — one warm half-smile (eyes engaged, lips closed) would push it over.",
    );
    if (Math.abs(r.posture.headTiltDeg) > 4)
      tips.push("Level the head a touch — a straight-on read reads as more assured.");
  } else {
    tips.push(
      isPrimary
        ? "Your expression already reads warm — keep that energy; it's your strongest asset."
        : "Your expression already reads warm — the smallest extra lift is what separates secondary from lead.",
    );
  }

  // ---- Photo quality (app) / Grooming (irl) --------------------------------
  if (mode === "app") {
    if (p.score < 4.5) {
      if (r.light.brightness < 110)
        tips.push("Move closer to a window or use a softbox — the photo is too dim.");
      if (r.light.brightness > 200)
        tips.push("Step back from the bright window or use a sheer curtain — the photo is overexposed.");
      if (r.light.evenness < 0.7)
        tips.push("Add a single bounce light on the shadow side to even out the face.");
      if (r.light.sharpness < 0.4)
        tips.push("Hold the phone steady, tap to focus, and use a 2-second timer.");
      tips.push("In-app: raise exposure +10 and warm the temperature slightly — most apps crush shadows otherwise.");
      tips.push("In-app: avoid heavy beauty filters — light 'skin smoothing' at most, then sharpen subtly.");
    } else if (p.score < 6.5) {
      tips.push(
        "Lighting is decent — face a window for even light and step back from overhead bulbs.",
      );
      if (r.light.sharpness < 0.45)
        tips.push("Tap to focus on the eyes and hold still — sharpness sells the shot.");
      tips.push("In-app: a +5 exposure and a touch of warmth beats any filter.");
    } else {
      tips.push(
        isPrimary
          ? "Photo quality is already strong — shoot in similar light next time and it stays consistent."
          : "Photo quality is already strong — one brighter, even-light retake is your fastest path to a lead photo.",
      );
    }
  } else {
    if (p.score < 4.5) {
      if (r.hair?.visible) {
        tips.push(
          `Your hair reads as ${hairTextureLabel(r.hair).toLowerCase()}, ${r.hair.color} — a styled cut for your ${r.shape} face shape is the fastest grooming win.`,
        );
      } else {
        tips.push(
          `Book a cut that suits your ${r.shape} face shape — grooming is the fastest in-person upgrade.`,
        );
      }
      if (r.ratios.jawlineAngle > 115)
        tips.push("A 3-day stubble or a trimmed beard visually defines a soft jawline.");
      tips.push("Keep brows tidy — it frames the eyes more than most people realize.");
    } else if (p.score < 6.5) {
      tips.push(
        "Grooming is close — a fresh cut and tidy brows are the highest-leverage next step.",
      );
      if (r.ratios.jawlineAngle > 115)
        tips.push("Stubble or a light trim adds structure to a soft jawline.");
    } else {
      tips.push(
        isPrimary
          ? "Grooming already reads clean — keep the routine; consistency is what in-person reads reward."
          : "Grooming already reads clean — a fresh cut and pressed fit would push you to a lead first impression.",
      );
    }
  }

  // ---- Style (app) / Presence (irl) ----------------------------------------
  if (mode === "app") {
    if (s.score < 4.5) {
      tips.push("Step back about 1.5 feet — your face should occupy ~30% of the frame.");
      tips.push("Match the angle to your face shape: a subtle 5-10° turn flatters most faces.");
    } else if (s.score < 6.5) {
      tips.push(
        "Framing is close — one step back and a slight angle would balance the composition.",
      );
      tips.push("Pick a calm background; busy scenes fight your face for attention.");
    } else {
      tips.push(
        isPrimary
          ? "Composition is solid — you're ready to be the lead photo in the set."
          : "Composition is solid — one angle tweak could make this your lead photo.",
      );
    }
  } else {
    if (s.score < 4.5) {
      tips.push("Stand tall with your shoulders back — posture changes how your face reads.");
      tips.push("Slow down: a relaxed, unhurried presence photographs better than a forced one.");
    } else if (s.score < 6.5) {
      tips.push(
        "Presence is close — squared shoulders and a soft smile would tip it over.",
      );
      tips.push("Wear what you'd actually wear on the date; comfort reads as confidence.");
    } else {
      tips.push(
        isPrimary
          ? "You read as present and confident — that energy carries further than any single detail."
          : "You read as present and confident — adding a touch of warmth tips that presence into a lead impression.",
      );
    }
  }

  // Dedupe while preserving order.
  const seen = new Set<string>();
  const unique = tips.filter((t) => {
    if (seen.has(t)) return false;
    seen.add(t);
    return true;
  });

  return unique.slice(0, 8);
}

function bell(x: number, ideal: number, spread: number): number {
  const d = Math.abs(x - ideal);
  return Math.max(0, 1 - d / spread);
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
