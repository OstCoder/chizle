// Weakspot identification + actionable recommendations.
// Templates are keyed on metric range; severity is computed from how far
// the metric is from its "ideal" zone.
//
// Every weakspot carries a `timing` bucket so the UI can order actions from
// immediate (do it in the next shot) to long-term (habits / training).
//
// NOTE: lighting is deliberately absent here. Lighting is a photo-quality /
// dating-scorecard concern, not a "change your face" improvement area, so the
// analyze view no longer recommends lighting changes.

import type {
  AnalysisReport,
  EyeReport,
  FaceShape,
  Weakspot,
} from "@/types/analysis";

interface AnalysisContext {
  ratios: AnalysisReport["ratios"];
  symmetry: AnalysisReport["symmetry"];
  posture: AnalysisReport["posture"];
  smile: AnalysisReport["smile"];
  eyes: EyeReport;
  shape: FaceShape;
  angle: AnalysisReport["angle"];
}

export function generateWeakspots(ctx: AnalysisContext): Weakspot[] {
  const spots: Weakspot[] = [];
  // Higher-confidence depth + brow weakspots: MediaPipe visibilities are
  // typically 0.9+ on clean frames; gating at 0.65 avoids spurious 3D advice
  // when hair/hand occlude key landmarks.
  const confident3d = (ctx.ratios.landmarksConfidence ?? 1) >= 0.65;

  // --- Jawline / lower third ---
  if (ctx.ratios.jawlineAngle > 120) {
    spots.push({
      id: "jawline-soft",
      area: "jawline",
      severity: severity(ctx.ratios.jawlineAngle > 135 ? 0.8 : 0.3),
      timing: "soon",
      title: "Lower third reads as soft / rounded",
      findings: [
        `Jawline angle is ~${Math.round(ctx.ratios.jawlineAngle)}° (tighter definition reads < 100°).`,
        `Cheek-to-jaw ratio is ${ctx.ratios.cheekToJawRatio.toFixed(2)} (closer to 1.0 reads more defined).`,
      ],
      recommendations: [
        "Stack chin tucks (3 sets of 15, slow, daily) to engage the submental muscles.",
        "Practice resting the tongue gently against the roof of the mouth with lips closed.",
        "Trim a beard straight across at the Adam's apple to add angular definition.",
        "Keep a 3-day stubble at the jawline; it visually narrows the lower third.",
      ],
    });
  } else if (ctx.ratios.jawlineAngle < 90 && confident3d) {
    // Positive-reinforcement weakspot — keeps the same confident3d gate as
    // 3D-derived advice so we only celebrate an angular jawline when the
    // gonion landmarks are credibly placed.
    spots.push({
      id: "jawline-angular",
      area: "jawline",
      severity: "low",
      timing: "soon",
      title: "Jawline is already angular",
      findings: [
        `Jawline angle is ~${Math.round(ctx.ratios.jawlineAngle)}°, which projects well.`,
      ],
      recommendations: [
        "Keep facial hair tight at the cheeks (a fade down to stubble) to emphasize the line.",
        "Avoid bulky chin straps in collars — open necklines complement the jaw.",
      ],
    });
  }

  // 3D depth — recessed chin, computed from MediaPipe z.
  if (confident3d && ctx.ratios.chinProjection > 0.05) {
    spots.push({
      id: "depth-recessed-chin",
      area: "depth",
      severity: severity(ctx.ratios.chinProjection > 0.1 ? 0.8 : 0.3),
      timing: "later",
      title: "Chin sits slightly back in profile",
      findings: [
        `Chin-to-nose-base 3D depth: ${ctx.ratios.chinProjection.toFixed(3)} (median ~0.02).`,
        "This is a structural measurement; small differences are normal.",
      ],
      recommendations: [
        "Forward growth is trainable: tongue-up-resting posture over months can shift resting chin position.",
        "Strong neck posture (chin tucked, crown tall) minimizes visual recession.",
        "A short, structured beard at the chin adds the illusion of projection.",
      ],
    });
  } else if (confident3d && ctx.ratios.midfaceProjection > 0.05) {
    spots.push({
      id: "depth-prominent-cheekbones",
      area: "depth",
      severity: "low",
      timing: "soon",
      title: "Cheekbones project forward of the midface",
      findings: [
        `Midface-to-cheekbone 3D depth: ${ctx.ratios.midfaceProjection.toFixed(3)} (high cheekbones).`,
      ],
      recommendations: [
        "Lean into the structure: contour just below the cheekbone, not on it, to keep the lift.",
        "Avoid heavy blush placement on the apples — sweep slightly upward from the cheekbone.",
      ],
    });
  }

  // --- Posture ---
  if (Math.abs(ctx.posture.headTiltDeg) > 4) {
    spots.push({
      id: "posture-tilt",
      area: "posture",
      severity: severity(Math.abs(ctx.posture.headTiltDeg) > 8 ? 0.8 : 0.3),
      timing: "now",
      title: "Head tilt in the shot",
      findings: [
        `Head tilt is ${ctx.posture.headTiltDeg.toFixed(1)}° (closer to 0° reads more confident).`,
      ],
      recommendations: [
        "Imagine a string pulling the crown of your head toward the ceiling.",
        "Square your shoulders to the camera, then tilt only the eyes, not the head.",
        "Take a few shots in burst mode — picking the one with the straightest head tilt makes a big difference.",
      ],
    });
  }

  // 3D-sourced pose hint: when the transform matrix was available, we trust
  // yaw/pitch/roll directly. Use them to surface a profile-angle weakspot
  // even when the silhouette looks frontal.
  if (ctx.posture.orientationSource === "matrix" && Math.abs(ctx.posture.rollDeg) > 6) {
    spots.push({
      id: "posture-roll",
      area: "posture",
      severity: severity(Math.abs(ctx.posture.rollDeg) > 12 ? 0.8 : 0.3),
      timing: "now",
      title: "Camera-side roll detected",
      findings: [
        `Roll (camera-z tilt) is ${ctx.posture.rollDeg.toFixed(1)}° from the 4x4 transform matrix.`,
        "Head appears tilted relative to camera plane even though the eyes look level.",
      ],
      recommendations: [
        "Square the phone to your face — slight handheld roll shows up as head tilt in most shots.",
        "Re-take with the phone propped against a stable surface, or use a mini tripod.",
      ],
    });
  }

  if (ctx.posture.chinToCamera < 0.7) {
    spots.push({
      id: "posture-chin",
      area: "posture",
      severity: severity(ctx.posture.chinToCamera < 0.5 ? 0.8 : 0.3),
      timing: "now",
      title: "Chin level is off",
      findings: [
        `Chin-to-camera level is ${Math.round(ctx.posture.chinToCamera * 100)}%.`,
        "A high or low chin can shorten or elongate the face in photos.",
      ],
      recommendations: [
        "Bring the camera to eye level — most selfies distort because the lens is below the chin.",
        "Push the chin slightly forward and down to define the jaw without tilting.",
        "Avoid extending the neck up; it tightens the lower-face muscles.",
      ],
    });
  }

  // --- Expression / smile ---
  if (!ctx.smile.detected) {
    spots.push({
      id: "expression-neutral",
      area: "expression",
      severity: "low",
      timing: "now",
      title: "Neutral expression — approachable, but a small smile opens you up",
      findings: [
        `Smile score is ${ctx.smile.score}/100.`,
        "A subtle smile (lip corners lifted, mouth closed) reads as warm without being performative.",
      ],
      recommendations: [
        "Try a half-smile and squint slightly — it engages the eyes (Duchenne).",
        "Think of someone you like when the shutter fires — it brightens the eyes.",
        "Avoid a forced wide grin; half-smiles are more flattering in still photos.",
      ],
    });
  }

  // Asymmetric smile from blendshape (left vs right scoring).
  if (ctx.smile.smileAsymmetry > 0.35) {
    spots.push({
      id: "smile-asymmetry",
      area: "expression",
      severity: severity(ctx.smile.smileAsymmetry > 0.6 ? 0.8 : 0.3),
      timing: "now",
      title: "Smile reads asymmetrically",
      findings: [
        `Left corner: ${(ctx.smile.smileLeft * 100).toFixed(0)}%, right corner: ${(ctx.smile.smileRight * 100).toFixed(0)}%.`,
        "Asymmetric smiles often project as a smirk rather than an open, warm smile.",
      ],
      recommendations: [
        "Slightly favor the weaker (lower-scoring) side by turning your body ~5° toward it.",
        "Practice the smile in a mirror to even out the engagement on both sides.",
        "A camera's auto-frame often straightens smiles — re-shoot if the asymmetry bothers you.",
      ],
    });
  }

  // Eye squint — blink is the strong signal; squint adds nuance. Both are
  // populated from blendshapes when MediaPipe provides them, and written as 0
  // by the geometric fallback in computeEyes. This unifies both paths cleanly.
  const leftBlink = ctx.eyes.eyeBlinkLeft ?? 0;
  const rightBlink = ctx.eyes.eyeBlinkRight ?? 0;
  const leftSquint = ctx.eyes.eyeSquintLeft ?? 0;
  const rightSquint = ctx.eyes.eyeSquintRight ?? 0;
  const leftOpenish = 1 - 0.7 * leftBlink - 0.3 * leftSquint;
  const rightOpenish = 1 - 0.7 * rightBlink - 0.3 * rightSquint;

  const blinkDetected = leftBlink > 0.5 || rightBlink > 0.5;
  const squintDetected = leftSquint > 0.6 || rightSquint > 0.6;
  // If blendshapes are not in play (both zeros), fall through to the
  // EAR-based openness the geometric path already filled in.
  const fallbackEarOpen =
    ctx.eyes.leftOpen < 0.4 || ctx.eyes.rightOpen < 0.4;
  const hadBlendshapeSignal = leftBlink || rightBlink || leftSquint || rightSquint;

  if (
    (hadBlendshapeSignal && (blinkDetected || squintDetected)) ||
    (!hadBlendshapeSignal && fallbackEarOpen)
  ) {
    const sevScore =
      hadBlendshapeSignal
        ? blinkDetected && Math.max(leftBlink, rightBlink) > 0.8
          ? 0.8
          : 0.3
        : ctx.eyes.leftOpen < 0.25 || ctx.eyes.rightOpen < 0.25
          ? 0.8
          : 0.3;
    spots.push({
      id: "eyes-squint",
      area: "expression",
      severity: severity(sevScore),
      timing: "now",
      title: "One or both eyes are squinting",
      findings: [
        `Eye openness (left ${(leftOpenish * 100).toFixed(0)}%, right ${(rightOpenish * 100).toFixed(0)}%)`,
        ...(hadBlendshapeSignal
          ? [
              `Blendshape blink L=${(leftBlink * 100).toFixed(0)}% R=${(rightBlink * 100).toFixed(0)}%, squint L=${(leftSquint * 100).toFixed(0)}% R=${(rightSquint * 100).toFixed(0)}%.`,
            ]
          : []),
      ],
      recommendations: [
        "Face the brightest light source head-on so both eyes receive equal light.",
        "Slow your blinks — practice a relaxed open-eye for 2 seconds before shooting.",
        "For prescription glasses, consider anti-reflective coating to reduce squint.",
      ],
    });
  }

  // --- Brow ---
  // Blendshape-derived; gate behind confident3d so low-visibility blendshape
  // scores (typical when hair crosses the forehead or the face is partly
  // shaded) don't produce spurious "looks surprised" weakspots.
  const browScore =
    (ctx.eyes.browInnerUp ?? 0) +
    (ctx.eyes.browOuterUpLeft ?? 0) +
    (ctx.eyes.browOuterUpRight ?? 0);
  if (confident3d && browScore > 1.4) {
    spots.push({
      id: "brow-lift",
      area: "brow",
      severity: severity(browScore > 2.2 ? 0.8 : 0.3),
      timing: "now",
      title: "Brows raised — face reads surprised",
      findings: [
        `Brow blendshape composite is ${(browScore / 3).toFixed(2)} (relaxed reads ~0.1).`,
        "Raised brows raise the upper eyelid, narrow the eye, and can read as alarm or surprise.",
      ],
      recommendations: [
        "Lower the inner eyebrow anchor — think 'confident calm' rather than engaged listening.",
        "Drop your shoulders and exhale right before the shutter; the brows follow the body.",
        "Soft side-light (not overhead) reduces the brow-shadow contrast that triggers a reflex raise.",
      ],
    });
  }

  // --- Symmetry ---
  if (ctx.symmetry.overall < 75) {
    spots.push({
      id: "symmetry",
      area: "symmetry",
      severity: severity(ctx.symmetry.overall < 65 ? 0.8 : 0.3),
      timing: "now",
      title: "Mild facial asymmetry",
      findings: [
        `Overall symmetry score is ${Math.round(ctx.symmetry.overall)}/100.`,
        `Eye-level alignment: ${Math.round(ctx.symmetry.eyeLevel)}, lip alignment: ${Math.round(ctx.symmetry.lipLevel)}.`,
        "A small amount of asymmetry is normal and often adds character.",
      ],
      recommendations: [
        "Find your 'good side' — turn 5-10° toward it for photos.",
        "Use a slightly off-center framing to keep the eye traveling.",
        "Confidence in expression reads more than minor asymmetry in any single shot.",
      ],
    });
  }

  // --- Framing ---
  if (ctx.angle === "profile") {
    spots.push({
      id: "framing-profile",
      area: "framing",
      severity: "low",
      timing: "now",
      title: "Profile view — great for jawline, weak for first impressions",
      findings: ["Photo is detected as a profile view."],
      recommendations: [
        "Use profile shots as a 2nd or 3rd photo on a profile — they highlight the jawline.",
        "Pair with a strong front-facing photo as your primary image.",
      ],
    });
  }

  // Sort by timing (now → soon → later), then severity within each bucket.
  const timingOrder = { now: 0, soon: 1, later: 2 } as const;
  const severityOrder = { high: 0, medium: 1, low: 2 } as const;
  spots.sort(
    (a, b) =>
      timingOrder[a.timing] - timingOrder[b.timing] ||
      severityOrder[a.severity] - severityOrder[b.severity],
  );
  return spots;
}

type Severity = Weakspot["severity"];

function severity(score: number): Severity {
  if (score >= 0.7) return "high";
  if (score >= 0.4) return "medium";
  return "low";
}
