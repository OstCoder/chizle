// Lazy MediaPipe FaceLandmarker loader.
//
// Assets are vendored under /public/mediapipe/ so the app has no runtime
// dependency on jsdelivr (the previous CDN URL was 404'ing). The wrapper
// itself is dynamic-imported so the landing page doesn't pay for it.

"use client";

import type { FaceLandmarkerResult } from "@mediapipe/tasks-vision";

const WASM_BASE = "/mediapipe/wasm";
const MODEL_URL = "/mediapipe/face_landmarker.task";

type FaceLandmarkerType = import("@mediapipe/tasks-vision").FaceLandmarker;

interface LandmarkerBundle {
  landmarker: FaceLandmarkerType;
  delegate: "GPU" | "CPU";
}

export type BundleStatus = "idle" | "loading" | "ready";

let bundlePromise: Promise<LandmarkerBundle> | null = null;
let bundleStatus: BundleStatus = "idle";
const statusListeners = new Set<(s: BundleStatus) => void>();

function setStatus(s: BundleStatus) {
  if (bundleStatus === s) return;
  bundleStatus = s;
  for (const fn of statusListeners) fn(s);
}

export function getBundleStatus(): BundleStatus {
  return bundleStatus;
}

export function subscribeBundleStatus(fn: (s: BundleStatus) => void): () => void {
  statusListeners.add(fn);
  return () => {
    statusListeners.delete(fn);
  };
}

export async function getFaceLandmarker(): Promise<FaceLandmarkerType> {
  if (typeof window === "undefined") {
    throw new Error("FaceLandmarker can only run in the browser.");
  }
  if (!bundlePromise) {
    setStatus("loading");
    bundlePromise = loadBundle().catch((err) => {
      // Self-reset so a transient failure can be retried on the next call.
      bundlePromise = null;
      setStatus("idle");
      throw err;
    });
  }
  const bundle = await bundlePromise;
  setStatus("ready");
  return bundle.landmarker;
}

async function loadBundle(): Promise<LandmarkerBundle> {
  // Dynamic import keeps the (~700KB) wrapper out of the initial JS chunk.
  const { FaceLandmarker, FilesetResolver } = await import(
    "@mediapipe/tasks-vision"
  );
  const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);

  // GPU first; fall back to CPU when WebGL fails (common on some Macs and
  // sandboxed browsers). CPU is plenty fast for a single static image.
  try {
    const landmarker = await FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true,
      runningMode: "IMAGE",
      numFaces: 1,
    });
    return { landmarker, delegate: "GPU" };
  } catch (gpuErr) {
    console.warn("[chizle] GPU delegate failed, using CPU.", gpuErr);
    const landmarker = await FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" },
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true,
      runningMode: "IMAGE",
      numFaces: 1,
    });
    return { landmarker, delegate: "CPU" };
  }
}

export async function detectFromImageData(
  image: ImageData,
): Promise<FaceLandmarkerResult | null> {
  const landmarker = await getFaceLandmarker();
  return landmarker.detect(image);
}

export async function detectFromImage(
  source: HTMLImageElement | HTMLVideoElement,
): Promise<FaceLandmarkerResult | null> {
  const landmarker = await getFaceLandmarker();
  return landmarker.detect(source);
}
