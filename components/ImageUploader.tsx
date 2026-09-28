"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AlertTriangle, Camera, ImagePlus, Lightbulb, ShieldCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { fileToDataURL, imageToImageData, loadImageFromUrl } from "@/lib/imageData";
import {
  cameraErrorNotice,
  classifyFile,
  photoNotice,
  type UploadNotice,
} from "@/lib/uploadDiagnostics";

interface ImageUploaderProps {
  onImage: (imageData: ImageData | null, source: HTMLImageElement | null) => void;
  label?: string;
  hint?: string;
  className?: string;
  size?: "default" | "compact";
  resetSignal?: number;
  /** Increment to programmatically open the file picker (e.g. empty-state CTA). */
  openSignal?: number;
}

/** A decoded photo held back until the user accepts its quality warning. */
interface HeldPhoto {
  dataUrl: string;
  imageData: ImageData;
  img: HTMLImageElement;
}

function stopStream(stream: MediaStream | null): void {
  if (!stream) return;
  for (const track of stream.getTracks()) track.stop();
}

export function ImageUploader({
  onImage,
  label = "Drop or upload a photo",
  hint = "Front-facing, neutral expression, good lighting work best.",
  className,
  size = "default",
  resetSignal,
  openSignal,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // Structured failure/warning messaging: what went wrong, how to fix it,
  // and which fallback action(s) to render underneath.
  const [notice, setNotice] = useState<UploadNotice | null>(null);
  // Photo decoded but held behind the pre-scan quality warning (dark / blurry /
  // angled — "scan anyway" / "pick another"). onImage is NOT called until the
  // user accepts, so the parent never scans a photo the user meant to discard.
  const [held, setHeld] = useState<HeldPhoto | null>(null);
  // Live camera: ref owns the tracks (authoritative for stopping), state
  // drives the viewfinder render.
  const [camStream, setCamStream] = useState<MediaStream | null>(null);
  const [camBusy, setCamBusy] = useState(false);
  const inputId = useId();

  const cameraAvailable =
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function";

  const stopCamera = useCallback(() => {
    stopStream(streamRef.current);
    streamRef.current = null;
    setCamStream(null);
    setCamBusy(false);
  }, []);

  // Release the camera on unmount — a leaked stream keeps the browser's
  // camera indicator on and blocks the next getUserMedia call.
  useEffect(
    () => () => {
      stopStream(streamRef.current);
      streamRef.current = null;
    },
    [],
  );

  // Attach the stream once the <video> element has committed.
  useEffect(() => {
    const video = videoRef.current;
    if (camStream && video) {
      video.srcObject = camStream;
      video.play().catch(() => undefined);
    }
  }, [camStream]);

  const openPicker = useCallback(() => inputRef.current?.click(), []);

  // Open the picker after a clear() that was really "pick a different photo".
  const openAfterClear = useRef(false);
  useEffect(() => {
    if (openAfterClear.current && !preview && !held) {
      openAfterClear.current = false;
      inputRef.current?.click();
    }
  }, [preview, held]);

  /**
   * Decode path shared by files and camera frames. Runs the real-time
   * pre-scan quality gate — lighting, blur, resolution (shared pixel
   * thresholds) and a quick landmark pass for angle — and either accepts the
   * photo or holds it behind a warning with a fallback choice. Nothing is
   * handed to the scan until the user accepts.
   */
  const ingest = useCallback(
    async (dataUrl: string) => {
      setPending(true);
      try {
        const img = await loadImageFromUrl(dataUrl);
        const imageData = imageToImageData(img);
        const warn = await photoNotice(imageData);
        setPreview(dataUrl);
        if (warn) {
          setNotice(warn);
          setHeld({ dataUrl, imageData, img });
        } else {
          setNotice(null);
          setHeld(null);
          onImage(imageData, img);
        }
      } catch (err) {
        console.error(err);
        setPreview(null);
        setNotice({
          tone: "error",
          title: "This image couldn't be decoded",
          message:
            "The file looks like an image but the browser failed to read it — it may be corrupt or use an uncommon encoding. Re-export it as JPG or PNG, or pick a different photo.",
          retryCamera: cameraAvailable,
        });
      } finally {
        setPending(false);
      }
    },
    [onImage, cameraAvailable],
  );

  const handleFile = useCallback(
    async (file: File) => {
      setNotice(null);
      setHeld(null);
      const rejected = classifyFile(file);
      if (rejected) {
        setPreview(null);
        setNotice({ ...rejected, retryCamera: rejected.retryCamera && cameraAvailable });
        return;
      }
      setPending(true);
      try {
        const dataUrl = await fileToDataURL(file);
        await ingest(dataUrl);
      } catch (err) {
        console.error(err);
        setPending(false);
        setPreview(null);
        setNotice({
          tone: "error",
          title: "Couldn't read that file",
          message:
            "The browser failed while opening it — the file may be locked, truncated, or not a photo. Try a different copy, or take a new photo.",
          retryCamera: cameraAvailable,
        });
      }
    },
    [ingest, cameraAvailable],
  );

  // ---- Camera capture ---------------------------------------------------
  const startCamera = useCallback(async () => {
    setNotice(null);
    const insecure =
      typeof window !== "undefined" && window.isSecureContext === false;
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      insecure
    ) {
      setNotice({
        tone: "error",
        title: "Camera isn't available here",
        message:
          "Camera access needs a secure (HTTPS) connection and a browser with camera support. Upload a photo from your files instead — analysis runs on-device either way.",
      });
      return;
    }
    setCamBusy(true);
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });
      } catch (err) {
        // Overconstrained = no camera matching the request; retry once with
        // any available camera before surfacing an error.
        if (err instanceof DOMException && err.name === "OverconstrainedError") {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        } else {
          throw err;
        }
      }
      streamRef.current = stream;
      setCamStream(stream);
      setCamBusy(false);
    } catch (err) {
      console.error(err);
      setCamBusy(false);
      setNotice(cameraErrorNotice(err));
    }
  }, []);

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas 2D context unavailable");
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      stopCamera();
      void ingest(dataUrl);
    } catch (err) {
      console.error(err);
      stopCamera();
      setNotice({
        tone: "error",
        title: "Couldn't capture from the camera",
        message:
          "The frame grab failed. Try again, or upload a photo from your files instead.",
        retryCamera: cameraAvailable,
      });
    }
  }, [stopCamera, ingest, cameraAvailable]);

  // ---- Fallback actions -------------------------------------------------
  const clear = () => {
    setPreview(null);
    setNotice(null);
    setHeld(null);
    if (inputRef.current) inputRef.current.value = "";
    onImage(null, null);
  };

  /** "Pick a different photo": clear the held one, then reopen the picker. */
  const pickAnother = () => {
    const hadImage = !!preview || !!held;
    clear();
    if (hadImage) {
      // Picker only remounts after the preview state commits.
      openAfterClear.current = true;
    } else {
      openPicker();
    }
  };

  /** Accept a held photo despite its pre-scan quality warning. */
  const useAnyway = () => {
    if (!held) return;
    setHeld(null);
    setNotice(null);
    onImage(held.imageData, held.img);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  // A parent bumping openSignal (empty-state CTA) opens the file picker.
  const lastOpenSig = useRef(openSignal);
  useEffect(() => {
    if (
      openSignal !== undefined &&
      openSignal !== 0 &&
      openSignal !== lastOpenSig.current
    ) {
      lastOpenSig.current = openSignal;
      inputRef.current?.click();
    }
  }, [openSignal]);

  const showCameraOption = !preview && cameraAvailable;

  return (
    <div
      className={cn(
        "card relative overflow-hidden p-1",
        size === "compact" && "p-0.5",
        className,
      )}
    >
      {!preview ? (
        camStream ? (
          // Live camera viewfinder with capture/cancel.
          <div className="overflow-hidden rounded-xl border border-white/10 bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="max-h-[480px] w-full object-cover"
            />
            <div className="flex items-center justify-center gap-2 px-4 py-3">
              <button
                type="button"
                onClick={captureFrame}
                className="btn-primary !px-4 !py-2 text-xs"
              >
                <Camera className="mr-1.5 inline h-3.5 w-3.5" aria-hidden="true" />
                Capture photo
              </button>
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setNotice(null);
                }}
                className="btn-secondary !px-4 !py-2 text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <label
            htmlFor={inputId}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center transition-colors",
              dragOver
                ? "border-accent-500/60 bg-accent-500/5"
                : "border-white/10 hover:border-white/20 hover:bg-white/[0.02]",
            )}
          >
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-white/5">
              <ImagePlus className="h-5 w-5 text-white/70" />
            </span>
            <div className="space-y-1">
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-white/40">{hint}</p>
            </div>
            <span className="text-xs text-white/30">PNG · JPG · WebP · SVG</span>
            <input
              id={inputId}
              ref={inputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </label>
        )
      ) : (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Uploaded preview"
            className="max-h-[480px] w-full rounded-xl object-contain"
          />
          <button
            type="button"
            onClick={clear}
            className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/60 text-white/80 backdrop-blur transition-colors hover:bg-black/80"
            aria-label="Remove image"
          >
            <X className="h-4 w-4" />
          </button>
          {pending && (
            <div className="absolute inset-0 grid place-items-center rounded-xl bg-black/40 backdrop-blur-sm">
              <div className="rounded-full bg-black/60 px-3 py-1.5 text-xs text-white/80">
                Checking photo…
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fallback action row: camera capture beside the dropzone. */}
      {showCameraOption && !camStream && !camBusy && (
        <button
          type="button"
          onClick={startCamera}
          className="btn-ghost mt-2 w-full !py-2 text-xs"
        >
          <Camera className="mr-1.5 inline h-3.5 w-3.5" aria-hidden="true" />
          Take a photo with your camera
        </button>
      )}
      {showCameraOption && !camStream && camBusy && (
        <p className="mt-2 text-center text-xs text-white/40">
          Waiting for camera permission — allow access in the browser prompt…
        </p>
      )}

      {/* Structured notice: format / decode / camera failures and the
          pre-scan quality warning (dark, blurry, angled), each with its
          fallback prompt(s). */}
      {notice && (
        <div
          role={notice.tone === "error" ? "alert" : "status"}
          className={cn(
            "mt-3 rounded-xl border px-3.5 py-3",
            notice.tone === "error"
              ? "border-red-500/30 bg-red-500/[0.07]"
              : "border-amber-500/30 bg-amber-500/[0.07]",
          )}
        >
          <div className="flex items-start gap-2">
            {notice.tone === "error" ? (
              <AlertTriangle
                className="mt-0.5 h-4 w-4 shrink-0 text-red-300"
                aria-hidden="true"
              />
            ) : (
              <Lightbulb
                className="mt-0.5 h-4 w-4 shrink-0 text-amber-300"
                aria-hidden="true"
              />
            )}
            <div className="min-w-0 space-y-1">
              <p
                className={cn(
                  "text-sm font-medium",
                  notice.tone === "error" ? "text-red-200" : "text-amber-200",
                )}
              >
                {notice.title}
              </p>
              <p className="text-xs leading-relaxed text-white/65">
                {notice.message}
              </p>
              {notice.tips && notice.tips.length > 0 && (
                <ul className="mt-1.5 space-y-1">
                  {notice.tips.map((tip) => (
                    <li
                      key={tip}
                      className="flex gap-1.5 text-xs leading-relaxed text-white/50"
                    >
                      <span
                        className={
                          notice.tone === "error"
                            ? "text-red-300/70"
                            : "text-amber-300/70"
                        }
                        aria-hidden="true"
                      >
                        ›
                      </span>
                      {tip}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Fallback prompts — never a dead end. */}
          <div className="mt-3 flex flex-wrap gap-2">
            {notice.tone === "warn" && held ? (
              <>
                <button
                  type="button"
                  onClick={useAnyway}
                  className="btn-primary !px-3 !py-1.5 text-xs"
                >
                  Scan it anyway
                </button>
                <button
                  type="button"
                  onClick={pickAnother}
                  className="btn-secondary !px-3 !py-1.5 text-xs"
                >
                  Pick a different photo
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={pickAnother}
                  className="btn-primary !px-3 !py-1.5 text-xs"
                >
                  Choose a photo
                </button>
                {notice.retryCamera && showCameraOption && !camStream && !camBusy && (
                  <button
                    type="button"
                    onClick={startCamera}
                    className="btn-secondary !px-3 !py-1.5 text-xs"
                  >
                    Try the camera again
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Persistent privacy badge — visible in every uploader state (empty,
          preview, error) so the on-device guarantee is always in view at the
          exact moment a user decides to hand over their face. */}
      <div
        title="Face mapping, scoring, and history storage all run locally in your browser. No photo is ever uploaded to a server."
        className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-500/[0.06] px-3 py-2 ring-1 ring-emerald-400/20"
      >
        <ShieldCheck
          className="h-4 w-4 shrink-0 text-emerald-300"
          aria-hidden="true"
        />
        <p className="text-xs leading-tight">
          <span className="font-semibold text-emerald-200">
            100% On-Device &amp; Private
          </span>
          <span className="text-emerald-200/60">
            {" "}— your photo never leaves this browser.
          </span>
        </p>
      </div>
      <ResetEffect signal={resetSignal} onTrigger={clear} hasPreview={!!preview} />
    </div>
  );
}

function ResetEffect({
  signal,
  onTrigger,
  hasPreview,
}: {
  signal: number | undefined;
  onTrigger: () => void;
  hasPreview: boolean;
}) {
  const lastSig = useRef(signal);
  useEffect(() => {
    if (signal !== undefined && hasPreview && signal !== lastSig.current) {
      lastSig.current = signal;
      onTrigger();
    }
  }, [signal, onTrigger, hasPreview]);
  return null;
}
