"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
}

const FEEDBACK_MS = 1800;

/**
 * Copies `text` to the clipboard on click with a short "Copied" confirmation.
 * Falls back to a hidden-textarea `execCommand` copy for browsers/contexts
 * without the async clipboard API (e.g. plain-HTTP localhost in some
 * browsers).
 */
export function CopyButton({ text, label = "Copy", className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const copy = useCallback(async () => {
    let ok = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        ok = true;
      }
    } catch {
      ok = false;
    }
    if (!ok) {
      // Legacy fallback: hidden textarea + execCommand. Still widely needed
      // on non-secure origins where navigator.clipboard is undefined. The
      // textarea is removed in `finally` so a throwing execCommand can't
      // leak it into the DOM.
      const ta = document.createElement("textarea");
      try {
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand("copy");
      } catch (err) {
        console.warn("[chizle] clipboard copy failed", err);
      } finally {
        document.body.removeChild(ta);
      }
    }
    if (!ok) return;
    setCopied(true);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCopied(false), FEEDBACK_MS);
  }, [text]);

  return (
    <button
      type="button"
      onClick={copy}
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/[0.03] px-2.5 py-1.5 text-xs font-medium text-white/65 transition-colors hover:bg-white/[0.06] hover:text-white",
        copied && "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
        className,
      )}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      {copied ? "Copied" : label}
    </button>
  );
}
