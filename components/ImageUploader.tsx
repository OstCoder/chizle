"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { fileToDataURL, imageToImageData, loadImageFromUrl } from "@/lib/imageData";

interface ImageUploaderProps {
  onImage: (imageData: ImageData | null, source: HTMLImageElement | null) => void;
  label?: string;
  hint?: string;
  className?: string;
  size?: "default" | "compact";
  resetSignal?: number;
}

export function ImageUploader({
  onImage,
  label = "Drop or upload a photo",
  hint = "Front-facing, neutral expression, good lighting work best.",
  className,
  size = "default",
  resetSignal,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      if (!file.type.startsWith("image/")) {
        setError("Please upload an image file (JPG, PNG, WebP).");
        return;
      }
      setPending(true);
      try {
        const dataUrl = await fileToDataURL(file);
        const img = await loadImageFromUrl(dataUrl);
        const imageData = imageToImageData(img);
        setPreview(dataUrl);
        onImage(imageData, img);
      } catch (err) {
        console.error(err);
        setError("Could not load that image. Try a different file.");
      } finally {
        setPending(false);
      }
    },
    [onImage],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const clear = () => {
    setPreview(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
    onImage(null, null);
  };

  return (
    <div
      className={cn(
        "card relative overflow-hidden p-1",
        size === "compact" && "p-0.5",
        className,
      )}
    >
      {!preview ? (
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
            <Upload className="h-5 w-5 text-white/70" />
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
                Loading image…
              </div>
            </div>
          )}
        </div>
      )}
      {error && (
        <p className="mt-3 px-3 text-sm text-red-400">{error}</p>
      )}
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
