"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Monitor, Moon, Sun } from "lucide-react";
import { devValidate, themeSchema } from "@/lib/schemas";

/** Theme preference. The literal union is contract-checked against
 *  themeSchema in lib/schemas.ts, so the stored value and the type can't
 *  drift apart. */
export type Theme = "system" | "light" | "dark";

const STORAGE_KEY = "chizle:theme";

/**
 * Resolve the effective dark/light state for a given theme preference.
 */
function resolve(theme: Theme): "light" | "dark" {
  if (theme === "light") return "light";
  if (theme === "dark") return "dark";
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

/**
 * Apply the resolved theme to <html> and point every theme-color <meta> at
 * the resolved color.
 *
 * IMPORTANT: this must never *remove* <meta> nodes. Next.js/React track the
 * elements they render into <head> as "hoistables"; detaching one behind
 * React's back makes the next head commit run
 *   instance.parentNode.removeChild(instance)
 * with a null parent, i.e. the runtime error
 * "Cannot read properties of null (reading 'removeChild')" — historically
 * thrown on the first client-side navigation after load (e.g. right after
 * signing in). Update content in place instead; only create a meta when the
 * document has none at all.
 */
function apply(resolved: "light" | "dark") {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(resolved);
  // Keep the browser/PWA chrome (installed-app status bar) on the active
  // theme. Both media-scoped metas get the same content, so whichever one
  // the browser picks still reflects the in-app theme.
  const color = resolved === "dark" ? "#08090d" : "#f5f5fa";
  const metas = document.querySelectorAll<HTMLMetaElement>(
    'meta[name="theme-color"]',
  );
  if (metas.length === 0) {
    const meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    meta.content = color;
    document.head.appendChild(meta);
    return;
  }
  metas.forEach((meta) => {
    meta.content = color;
  });
}

/**
 * Persist + apply a theme preference.
 */
function setTheme(theme: Theme) {
  devValidate(themeSchema, theme, "theme preference");
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* quota / privacy mode */
  }
  apply(resolve(theme));
}

/**
 * Read the saved preference (or "system" if nothing stored).
 */
function readSaved(): Theme {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    // Schema-validated: anything outside "system" | "light" | "dark"
    // (hand-edited storage, future schema drift) degrades to "system".
    const result = themeSchema.safeParse(raw);
    if (result.success) return result.data;
  } catch { /* ignore */ }
  return "system";
}

/* ------------------------------------------------------------------ */
/*  ThemeToggle — the visible button                                   */
/* ------------------------------------------------------------------ */

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setLocal] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  // Hydrate from localStorage after mount (avoids SSR mismatch).
  useEffect(() => {
    const saved = readSaved();
    setLocal(saved);
    apply(resolve(saved));
    setMounted(true);
  }, []);

  // Re-assert the resolved color after hydration and on every route change:
  // navigation refreshes parts of <head>, and a rebuilt theme-color meta
  // would otherwise fall back to its server-rendered OS color.
  //
  // IMPORTANT: re-read the persisted preference instead of trusting this
  // instance's state. The site header renders TWO toggles (desktop nav +
  // mobile menu) with independent state; without re-reading, the toggle the
  // user did NOT click would re-apply its stale value on every navigation,
  // silently reverting the choice just made (e.g. flipping back to light
  // when returning to the sign-in page).
  useEffect(() => {
    if (!mounted) return;
    const saved = readSaved();
    if (saved !== theme) setLocal(saved);
    apply(resolve(saved));
  }, [mounted, theme, pathname]);

  // Listen for OS preference changes when in "system" mode.
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => apply(resolve("system"));
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const cycle = useCallback(() => {
    setLocal((prev) => {
      const next: Theme =
        prev === "system" ? "light" : prev === "light" ? "dark" : "system";
      setTheme(next);
      return next;
    });
  }, []);

  // Don't render until hydrated to avoid flash.
  if (!mounted) {
    return (
      <button
        type="button"
        className="grid h-8 w-8 place-items-center rounded-lg text-white/50 opacity-0"
        aria-label="Toggle theme"
        disabled
      >
        <Monitor className="h-4 w-4" />
      </button>
    );
  }

  const Icon =
    theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;
  const label =
    theme === "light"
      ? "Light mode"
      : theme === "dark"
        ? "Dark mode"
        : "System theme";

  return (
    <button
      type="button"
      onClick={cycle}
      title={label}
      aria-label={label}
      className={
        className ??
        "grid h-8 w-8 place-items-center rounded-lg text-white/60 transition-colors hover:bg-white/5 hover:text-white"
      }
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

/**
 * Inline <script> content for <head> — applies the saved theme before first
 * paint to prevent FOUC (flash of unstyled / wrong-theme content).
 *
 * Usage in layout.tsx:
 *   <script dangerouslySetInnerHTML={{ __html: themePreloadScript }} />
 */
export const themePreloadScript = `(function(){
  try {
    var t = localStorage.getItem('${STORAGE_KEY}');
    var c = document.documentElement.classList;
    // Clear first so a stale class (bfcache restore, prior apply) can never
    // survive alongside the freshly resolved one.
    c.remove('light');
    c.remove('dark');
    if (t === 'light') c.add('light');
    else if (t === 'dark') c.add('dark');
    else {
      if (window.matchMedia('(prefers-color-scheme:dark)').matches) c.add('dark');
      else c.add('light');
    }
  } catch(e) {}
})();`;
