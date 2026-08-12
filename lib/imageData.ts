// Shared image-loading helpers used by both the user-facing uploader and the
// /test-gallery page. All paths run client-side.

"use client";

const DEFAULT_MAX_DIMENSION = 1024;
const DEFAULT_LOAD_TIMEOUT_MS = 15_000;

// Read a File as a same-origin data URL.
export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () =>
      reject(reader.error ?? new Error("FileReader failed"));
    reader.readAsDataURL(file);
  });
}

// Load an image from any same-origin URL (data: or relative) into an
// HTMLImageElement ready for canvas drawImage. Times out after 15 s by default
// so a missing/slow fixture URL surfaces as a clean error instead of hanging.
export function loadImageFromUrl(
  url: string,
  timeoutMs: number = DEFAULT_LOAD_TIMEOUT_MS,
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timer = setTimeout(
      () => reject(new Error(`Timed out loading image: ${url}`)),
      timeoutMs,
    );
    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      reject(new Error(`Failed to load image: ${url}`));
    };
    img.src = url;
  });
}

// Draw the image into a down-scaled canvas and hand back the pixel data.
// Down-scaling keeps the ImageData payload small (safer for FaceLandmarker).
//
// IMPORTANT: imageSmoothingEnabled is set to `false` so the canvas keeps the
// raw pixel data from the source JPEG/PNG. With the default-smoothing
// behaviour enabled, drawImage applies bilinear filtering during the
// downscale, which biases the Laplacian-variance sharpness metric upward and
// drifts the browser-side calibration readings away from the CLI's
// `sharp()`-loaded pixel data. Disabling smoothing makes the two pipelines
// agree on what `imageData` actually contains so a calibration run on
// /test-gallery produces ranges that match what `npm run validate` sees.
export function imageToImageData(
  img: HTMLImageElement,
  maxDimension: number = DEFAULT_MAX_DIMENSION,
): ImageData {
  let { width, height } = img;
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  width = Math.round(width * scale);
  height = Math.round(height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}

// Re-encode downscaled ImageData into a compact JPEG data URL. Used for
// localStorage persistence — storing the original file's data URL would be
// multi-MB and blow the quota; the 1024px ImageData re-encodes to a few
// hundred KB at most. Smoothing is re-enabled here since this is a display
// thumbnail, not an analysis input.
export function imageDataToDataURL(
  data: ImageData,
  quality: number = 0.85,
): string {
  const canvas = document.createElement("canvas");
  canvas.width = data.width;
  canvas.height = data.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.putImageData(data, 0, 0);
  return canvas.toDataURL("image/jpeg", quality);
}

// Re-encode ImageData into a small JPEG thumbnail (a few KB) for the history
// strip. Full-size images are only kept on the most recent history entry to
// respect the localStorage quota; every entry keeps a thumbnail.
export function imageDataToThumbURL(
  data: ImageData,
  maxDim: number = 180,
  quality: number = 0.7,
): string {
  const scale = Math.min(1, maxDim / Math.max(data.width, data.height));
  const w = Math.max(1, Math.round(data.width * scale));
  const h = Math.max(1, Math.round(data.height * scale));
  const src = document.createElement("canvas");
  src.width = data.width;
  src.height = data.height;
  const sctx = src.getContext("2d");
  if (!sctx) return "";
  sctx.putImageData(data, 0, 0);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "medium";
  ctx.drawImage(src, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}
