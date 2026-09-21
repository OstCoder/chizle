// One-page PDF export for the /analyze report.
//
// Builds a clean, brand-matched A4 sheet with jsPDF (dynamically imported so
// the analyze bundle only pays for it when the user actually exports):
//   - header band with the scan photo + overall/potential headline scores
//   - feature buckets (skin / hair / structure) with rating meters
//   - detected attributes grid
//   - prioritized action plan with estimated gains
//   - the personalized daily routine as a printable checklist
// Everything is composed from data the app already computed (lib/ratings,
// lib/glow) — no new scoring logic lives here.

import type { PersistedAnalysis } from "./persistence";
import type { RatingResult } from "./ratings";
import type { RoutineItem } from "./glow";
import { cap } from "./utils";
import { HAIR_COLOR_LABEL, hairTextureLabel } from "./hair";
import type { jsPDF } from "jspdf"; // type-only; the runtime import is dynamic

export interface ReportPdfInput {
  entry: PersistedAnalysis;
  rating: RatingResult;
  routine: RoutineItem[];
  /** Display name for the report header (optional). */
  userName?: string | null;
}

// Brand palette (mirrors tailwind.config.ts).
const INK: [number, number, number] = [12, 13, 19];
const PANEL: [number, number, number] = [244, 245, 247];
const BORDER: [number, number, number] = [226, 228, 233];
const TEXT: [number, number, number] = [38, 42, 56];
const MUTED: [number, number, number] = [107, 114, 128];
const SUBTLE: [number, number, number] = [160, 165, 180];
const ACCENT: [number, number, number] = [249, 115, 22];
const ACCENT_SOFT: [number, number, number] = [253, 186, 116];
const WHITE: [number, number, number] = [255, 255, 255];

const MARGIN = 40;

type Doc = jsPDF;

/** Build the document and trigger the browser download. */
export async function downloadReportPdf(input: ReportPdfInput): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  compose(doc, input);
  doc.save(`chizle-face-report-${fileDate()}.pdf`);
}

function compose(doc: Doc, input: ReportPdfInput): void {
  const { entry, rating, routine, userName } = input;
  const report = entry.report;
  const W = doc.internal.pageSize.getWidth();
  const contentW = W - MARGIN * 2;

  doc.setFont("helvetica", "normal");

  // ---------------------------------------------------------------- header
  const bandY = 36;
  const bandH = 92;
  doc.setFillColor(...INK);
  doc.roundedRect(MARGIN, bandY, contentW, bandH, 14, 14, "F");

  // Scan photo (aspect-fit into a 64pt square, right side of the band).
  const photoBox = 64;
  const photoX = MARGIN + contentW - photoBox - 14;
  const photoY = bandY + 14;
  const src = entry.image || entry.thumb;
  if (src) {
    try {
      doc.setDrawColor(...BORDER);
      doc.roundedRect(photoX - 2, photoY - 2, photoBox + 4, photoBox + 4, 8, 8, "S");
      const props = doc.getImageProperties(src);
      const scale = Math.min(photoBox / props.width, photoBox / props.height);
      const pw = props.width * scale;
      const ph = props.height * scale;
      doc.addImage(
        src,
        "JPEG",
        photoX + (photoBox - pw) / 2,
        photoY + (photoBox - ph) / 2,
        pw,
        ph,
      );
    } catch {
      drawPhotoPlaceholder(doc, photoX, photoY, photoBox);
    }
  } else {
    drawPhotoPlaceholder(doc, photoX, photoY, photoBox);
  }

  const textX = MARGIN + 22;
  doc.setTextColor(...ACCENT);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("CHIZLE", textX, bandY + 26, { charSpace: 2, baseline: "top" });

  doc.setTextColor(...WHITE);
  doc.setFontSize(19);
  doc.text("Face Analysis Report", textX, bandY + 46, { baseline: "top" });

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...SUBTLE);
  doc.setFontSize(8.5);
  const who = userName ? `· Prepared for ${userName} ` : "";
  doc.text(
    `Scanned ${shortDate(entry.savedAt)} ${who}· Analyzed on-device`,
    textX,
    bandY + 70,
    { baseline: "top" },
  );

  // ----------------------------------------------------------- score panels
  const panels: Array<{ label: string; value: string; accent?: boolean }> = [
    { label: "Overall", value: `${rating.current.toFixed(1)} / 10`, accent: true },
    { label: "Potential", value: `${rating.potential.toFixed(1)} / 10` },
    { label: "Symmetry", value: `${Math.round(report.symmetry.overall)} / 100` },
    { label: "Face shape", value: cap(report.shape) },
  ];
  const panelY = bandY + bandH + 16;
  const panelH = 54;
  const gap = 10;
  const panelW = (contentW - gap * (panels.length - 1)) / panels.length;
  panels.forEach((p, i) => {
    const px = MARGIN + i * (panelW + gap);
    doc.setFillColor(...PANEL);
    doc.roundedRect(px, panelY, panelW, panelH, 10, 10, "F");
    doc.setTextColor(...MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(p.label.toUpperCase(), px + 12, panelY + 12, {
      charSpace: 1,
      baseline: "top",
    });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(p.value.length > 8 ? 12 : 15);
    doc.setTextColor(...(p.accent ? ACCENT : TEXT));
    doc.text(truncate(doc, p.value, panelW - 24), px + 12, panelY + 28, {
      baseline: "top",
    });
  });

  // ------------------------------------------------------------ bucket rows
  let y = sectionTitle(doc, "Feature breakdown", panelY + panelH + 24);
  y += 4;
  for (const bucket of rating.buckets) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...TEXT);
    doc.text(bucket.label, MARGIN, y, { baseline: "top" });
    doc.setTextColor(...ACCENT);
    doc.text(`${bucket.score.toFixed(1)} / 10`, MARGIN + contentW, y, {
      align: "right",
      baseline: "top",
    });

    drawMeter(doc, MARGIN, y + 14, contentW, 6, bucket.score / 10);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    const flag = bucket.flags[0] ? `  ·  Flag: ${bucket.flags[0]}` : "";
    doc.text(
      truncate(doc, `${bucket.notes[0] ?? ""}${flag}`, contentW),
      MARGIN,
      y + 27,
      { baseline: "top" },
    );
    y += 42;
  }

  // ----------------------------------------------------- detected attributes
  const quality =
    report.imageQuality.quality === "good"
      ? "Good"
      : report.imageQuality.quality === "ok"
        ? "OK"
        : "Poor";
  const hair = report.hair?.visible
    ? `${hairTextureLabel(report.hair)} · ${HAIR_COLOR_LABEL[report.hair.color]}`
    : "Not in frame";
  const attributes: Array<[string, string]> = [
    ["Symmetry", `${Math.round(report.symmetry.overall)} / 100`],
    ["Smile", `${report.smile.score} / 100`],
    ["Thirds balance", `${Math.round(report.ratios.thirdsBalance * 100)}%`],
    ["Jawline angle", `${Math.round(report.ratios.jawlineAngle)}°`],
    ["Head tilt", `${report.posture.headTiltDeg.toFixed(1)}°`],
    ["Photo angle", cap(report.angle)],
    ["Hair read", hair],
    ["Photo quality", quality],
  ];
  y = sectionTitle(doc, "Detected attributes", y + 16) + 4;
  const colW = (contentW - 16) / 2;
  attributes.forEach(([label, value], i) => {
    const cx = MARGIN + (i % 2) * (colW + 16);
    const cy = y + Math.floor(i / 2) * 26;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), cx, cy, { charSpace: 0.8, baseline: "top" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...TEXT);
    doc.text(truncate(doc, value, colW), cx, cy + 13, { baseline: "top" });
  });
  y += Math.ceil(attributes.length / 2) * 26;

  // --------------------------------------------------------------- plan
  y = sectionTitle(doc, "How to reach your potential", y + 16) + 4;
  const steps = rating.plan.slice(0, 4);
  if (steps.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text("Nothing flagged — keep the routine steady.", MARGIN, y, {
      baseline: "top",
    });
    y += 20;
  } else {
    steps.forEach((step, i) => {
      const cy = y + i * 30;
      doc.setFillColor(...ACCENT);
      doc.circle(MARGIN + 7, cy + 8, 7, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...WHITE);
      doc.text(String(i + 1), MARGIN + 7, cy + 8, {
        align: "center",
        baseline: "middle",
      });
      doc.setFontSize(9.5);
      doc.setTextColor(...TEXT);
      doc.text(
        truncate(doc, step.title, contentW - 60),
        MARGIN + 22,
        cy,
        { baseline: "top" },
      );
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text(
        truncate(doc, step.fix, contentW - 60),
        MARGIN + 22,
        cy + 12,
        { baseline: "top" },
      );
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...ACCENT);
      doc.text(`+${step.gain.toFixed(2)}`, MARGIN + contentW, cy, {
        align: "right",
        baseline: "top",
      });
    });
    y += steps.length * 30;
  }

  // --------------------------------------------------------------- routine
  y = sectionTitle(doc, "Your daily routine", y + 14) + 4;
  const items = routine.slice(0, 6);
  items.forEach((item, i) => {
    const cx = MARGIN + (i % 2) * (colW + 16);
    const cy = y + Math.floor(i / 2) * 20;
    doc.setDrawColor(...SUBTLE);
    doc.roundedRect(cx, cy + 1, 9, 9, 2.5, 2.5, "S");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...TEXT);
    doc.text(truncate(doc, item.label, colW - 15), cx + 15, cy, {
      baseline: "top",
    });
  });
  y += Math.ceil(items.length / 2) * 20;

  // ---------------------------------------------------------------- footer
  const footerY = Math.max(y + 24, doc.internal.pageSize.getHeight() - 56);
  doc.setDrawColor(...BORDER);
  doc.line(MARGIN, footerY, W - MARGIN, footerY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text(
    `Generated on-device with Chizle — your photo never left this browser.  ·  ${shortDate(new Date().toISOString())}`,
    MARGIN,
    footerY + 14,
    { baseline: "top" },
  );
  doc.text(
    "Potential = current + action-plan gains",
    W - MARGIN,
    footerY + 14,
    { align: "right", baseline: "top" },
  );
}

// ------------------------------------------------------------------ helpers

function sectionTitle(doc: Doc, label: string, y: number): number {
  doc.setFillColor(...ACCENT);
  doc.roundedRect(MARGIN, y + 1, 3, 12, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text(label, MARGIN + 10, y, { baseline: "top" });
  return y + 20;
}

function drawMeter(
  doc: Doc,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: number,
): void {
  doc.setFillColor(...BORDER);
  doc.roundedRect(x, y, w, h, h / 2, h / 2, "F");
  const fillW = Math.max(h, Math.min(1, Math.max(0, fill)) * w);
  doc.setFillColor(...ACCENT);
  doc.roundedRect(x, y, fillW, h, h / 2, h / 2, "F");
}

function drawPhotoPlaceholder(
  doc: Doc,
  x: number,
  y: number,
  size: number,
): void {
  doc.setFillColor(...PANEL);
  doc.roundedRect(x, y, size, size, 8, 8, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...MUTED);
  doc.text("No photo", x + size / 2, y + size / 2, {
    align: "center",
    baseline: "middle",
  });
}

/** Shrink-to-fit ellipsis using the currently set font. */
function truncate(doc: Doc, text: string, maxWidth: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (doc.getTextWidth(clean) <= maxWidth) return clean;
  let t = clean;
  while (t.length > 1 && doc.getTextWidth(`${t}…`) > maxWidth) {
    t = t.slice(0, -1);
  }
  return `${t}…`;
}

function shortDate(iso: string | undefined): string {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return "recently";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fileDate(): string {
  return new Date().toISOString().slice(0, 10);
}
