"use client";

import { useEffect } from "react";

/**
 * Registers the Chizle service worker (public/sw.js) so the dashboard,
 * daily habit logs, and grooming guides keep working offline.
 *
 * In dev the worker is registered with ?dev=1, which switches it to
 * network-first behavior everywhere so stale webpack chunks can never
 * break hot reload.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Service workers need a secure context; skip cleanly on plain http.
    const { protocol, hostname } = window.location;
    const secure =
      protocol === "https:" ||
      hostname === "localhost" ||
      hostname === "127.0.0.1";
    if (!secure) return;

    const register = () => {
      const src =
        process.env.NODE_ENV === "production" ? "/sw.js" : "/sw.js?dev=1";
      navigator.serviceWorker.register(src).catch((err) => {
        // Never block the app on a failed registration (private mode, etc.).
        console.warn("[chizle] service worker registration failed", err);
      });
    };

    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
