// User-facing messaging for the three ways an upload can go wrong:
//
//  1. Wrong / unsupported file format — classified BEFORE we try to decode,
//     so the user gets a specific fix ("HEIC isn't decodable, export a JPG")
//     instead of a generic "could not load that image".
//  2. Camera problems — mapped from getUserMedia DOMException names to a
//     plain-English explanation plus how to re-grant permission (or fall back
//     to picking a file, which always works).
//  3. Photo quality — detected before the scan starts: lighting, blur, and
//     resolution from the shared pixel thresholds (lib/imageQuality), plus an
//     angle check from a quick landmark pass (turned-away / tilted frames
//     degrade facial landmark detection). Surfaced as a non-blocking warning
//     with the actionable tips from lib/diagnostics, gated behind an explicit
//     "use anyway / pick another" choice.
//
// Every notice carries a fallback action rendered by ImageUploader — a user
// should never hit a dead end.

import type { LandmarkPoint } from "@/types/analysis";
import { tipsForReason } from "./diagnostics";
import { preScanIssues } from "./imageQuality";
import { detectFromImageData } from "./mediapipe";
import { computePosture } from "./posture";

export interface UploadNotice {
  tone: "error" | "warn";
  title: string;
  message: string;
  /** Optional one-line fixes, rendered as a bullet list. */
  tips?: string[];
  /** Offer a "Try camera again" button alongside the file-picker fallback. */
  retryCamera?: boolean;
}

// Extensions the browser cannot decode as an image (or that arrive with a
// MIME type we reject). Checked by extension too, because photo files often
// come through with an empty or generic `file.type`.
const UNSUPPORTED_EXTS = new Set([
  "heic",
  "heif",
  "tiff",
  "tif",
  "bmp",
  "psd",
  "raw",
  "cr2",
  "cr3",
  "nef",
  "arw",
  "dng",
  "orf",
  "rw2",
]);

const LIKELY_IMAGE_EXTS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "svg",
  "avif",
]);

const MAX_FILE_BYTES = 25 * 1024 * 1024;

function extOf(file: File): string {
  const dot = file.name.lastIndexOf(".");
  return dot >= 0 ? file.name.slice(dot + 1).toLowerCase() : "";
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Validate a picked/dropped file before decoding. Returns a notice when the
 * file must be rejected, or null when it's worth trying.
 */
export function classifyFile(file: File): UploadNotice | null {
  const ext = extOf(file);
  const type = (file.type || "").toLowerCase();

  if (file.size === 0) {
    return {
      tone: "error",
      title: "That file is empty",
      message:
        "It has no data in it — the copy or download probably didn't finish. Grab the original photo and try again.",
    };
  }

  if (UNSUPPORTED_EXTS.has(ext)) {
    const isHeic = ext === "heic" || ext === "heif";
    return {
      tone: "error",
      title: isHeic
        ? "HEIC photos can't be read in the browser"
        : `.${ext} files can't be scanned`,
      message: isHeic
        ? "iPhones shoot HEIC by default, but no browser can decode it. Export the photo as JPG, or tap “Take a photo” and Chizle will capture one in a supported format."
        : "This format isn't one browsers can turn into pixels for analysis. Export it as JPG or PNG first, or pick a different photo.",
      tips: isHeic
        ? [
            "iPhone: Settings → Camera → Formats → Most Compatible (future shots save as JPG).",
            "Already shot? Open Photos → share the image → Save to Files, then export as JPEG.",
          ]
        : ["JPG, PNG, WebP, and SVG all work."],
      retryCamera: true,
    };
  }

  if (type === "application/pdf" || ext === "pdf") {
    return {
      tone: "error",
      title: "That's a PDF, not a photo",
      message:
        "Chizle needs an image of a face to map. Export the page as a JPG or PNG, or pick a photo from your camera roll.",
      retryCamera: true,
    };
  }

  if (type.startsWith("video/")) {
    return {
      tone: "error",
      title: "That's a video file",
      message:
        "Scans run on a single still frame — drop a JPG/PNG screenshot from the video, or take a fresh photo instead.",
      retryCamera: true,
    };
  }

  // Non-image MIME, or an empty MIME with an extension we don't recognize.
  if (type && !type.startsWith("image/")) {
    return {
      tone: "error",
      title: "Unsupported file format",
      message: `“${file.name}” is a ${type.split("/")[1] ?? "non-image"} file. Chizle accepts JPG, PNG, WebP, GIF, AVIF, and SVG photos.`,
      retryCamera: true,
    };
  }
  if (!type && !LIKELY_IMAGE_EXTS.has(ext)) {
    return {
      tone: "error",
      title: "Couldn't tell what kind of file this is",
      message: `“${file.name}” has no image extension or type the browser recognizes. Re-export it as JPG or PNG and upload again.`,
      retryCamera: true,
    };
  }

  if (file.size > MAX_FILE_BYTES) {
    return {
      tone: "error",
      title: "That photo is too large",
      message: `${formatSize(file.size)} is over the 25 MB limit. Phones export much smaller JPGs — try re-saving the photo at standard quality.`,
      tips: ["Downscaling to ~4000 px on the long edge is plenty for a scan."],
    };
  }

  return null;
}

/**
 * Map a getUserMedia failure to a notice that explains what happened and how
 * to recover. Every branch offers the file-picker fallback, since uploading
 * an existing photo needs no permission at all.
 */
export function cameraErrorNotice(err: unknown): UploadNotice {
  const name = err instanceof DOMException ? err.name : "";

  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return {
        tone: "error",
        title: "Camera access was blocked",
        message:
          "Your browser is denying the camera for this site. Re-enable it from the address bar, then retry — or skip the camera and upload a photo you already have.",
        tips: [
          "Chrome/Edge: click the camera or tune icon in the address bar → Site settings → Camera → Allow.",
          "Safari (iPhone): Settings → Safari → Camera → Allow, or tap the “Aa” menu → Website Settings → Camera → Allow.",
          "Firefox: padlock icon in the address bar → Connection secure → More information → Permissions → Use the Camera.",
        ],
        retryCamera: true,
      };
    case "SecurityError":
      return {
        tone: "error",
        title: "Camera isn't allowed on this page",
        message:
          "The browser blocked camera access for security reasons (the page origin isn't permitted to use it). Upload a file instead — scans run entirely on-device either way.",
        retryCamera: true,
      };
    case "NotFoundError":
    case "DevicesNotFoundError":
      return {
        tone: "error",
        title: "No camera found",
        message:
          "This device doesn't seem to have a camera the browser can reach. Upload a photo from your files instead.",
      };
    case "NotReadableError":
    case "TrackStartError":
      return {
        tone: "error",
        title: "Camera is busy",
        message:
          "Another app or tab is already using the camera. Close video calls or other camera apps, then retry — or upload an existing photo.",
        retryCamera: true,
      };
    case "OverconstrainedError":
      return {
        tone: "error",
        title: "No matching camera",
        message:
          "The requested camera mode isn't available on this device. Retry, or upload a photo instead.",
        retryCamera: true,
      };
    default:
      return {
        tone: "error",
        title: "Couldn't start the camera",
        message:
          "Something went wrong opening the camera. Retry, or fall back to uploading a photo — both produce the same on-device scan.",
        retryCamera: true,
      };
  }
}

/**
 * Angle check from a quick landmark pass — no scoring, no report. Yaw (from
 * the facial transform matrix, or the cheek-z fallback) tells us when the
 * face is turned toward profile, and the eye-line roll catches a tilted
 * frame; both are exactly what throws off facial landmark detection.
 *
 * Returns [] when no face is found or the detector can't run — the scan
 * itself performs the same landmark pass and reports those cases.
 */
async function angleIssues(imageData: ImageData): Promise<string[]> {
  try {
    const result = await detectFromImageData(imageData);
    const points = (result?.faceLandmarks?.[0] ?? null) as LandmarkPoint[] | null;
    if (!points || points.length < 468) return [];
    const posture = computePosture(
      points,
      result?.facialTransformationMatrixes?.[0]?.data as number[] | undefined,
    );
    const reasons: string[] = [];
    if (posture.angle === "profile") {
      reasons.push("Face is turned too far to the side");
    }
    if (Math.abs(posture.headTiltDeg) > 30) {
      reasons.push("Photo is tilted at an angle");
    }
    return reasons;
  } catch (err) {
    // A detector load failure must never block the upload — the scan runs
    // the same landmark pass afterwards and surfaces its own error then.
    console.warn("[chizle] pre-scan angle check skipped", err);
    return [];
  }
}

/**
 * Turn pre-scan quality issues into a non-blocking warning: lighting, blur,
 * and resolution from the shared pixel thresholds (lib/imageQuality), plus
 * the landmark-based angle check. Lists everything that would hurt landmark
 * accuracy in one notice; the caller offers "use anyway / pick another" as
 * the fallback choice, so the scan only starts on a photo the user accepts.
 */
export async function photoNotice(
  imageData: ImageData,
): Promise<UploadNotice | null> {
  const reasons = [
    ...preScanIssues(imageData),
    ...(await angleIssues(imageData)),
  ];
  if (reasons.length === 0) return null;
  return {
    tone: "warn",
    title: "This photo may throw off the scan",
    message: `Chizle flagged: ${reasons.join(", ")}. Facial landmark detection is most accurate on a sharp, evenly lit, straight-on shot. You can scan it anyway, or swap in a better photo.`,
    tips: tipsForReason(reasons.join("; ")),
  };
}
