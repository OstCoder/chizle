/* Chizle service worker.
 *
 * Goal: the dashboard, the daily habit checklists, and the grooming guides
 * keep working offline or on a flaky connection.
 *
 * Strategies
 *  - Page navigations: network-first with a short timeout, falling back to
 *    the last cached HTML (finally /offline). Online it always revalidates
 *    so content stays fresh; offline the cached page renders instantly.
 *  - RSC data/prefetch requests: left to the network on purpose. When they
 *    fail offline, Next.js falls back to a full page load — which we answer
 *    from the page cache. Serving cached HTML for an RSC request would
 *    break the App Router instead of helping it.
 *  - Static build assets, vendored MediaPipe files, icons, fixture images:
 *    cache-first — they are content-addressed or effectively immutable.
 *
 * Registered as /sw.js in production and /sw.js?dev=1 from `next dev`
 * (dev mode forces network-first for everything so stale webpack chunks
 * never break hot reload).
 *
 * Bump VERSION whenever the cached shell should be discarded wholesale.
 */

const VERSION = "v1";
const PAGES_CACHE = `chizle-pages-${VERSION}`;
const ASSETS_CACHE = `chizle-assets-${VERSION}`;
const OFFLINE_URL = "/offline";
const NETWORK_TIMEOUT_MS = 4000;

// Core product pages precached at install so they open offline even if the
// browser never visited them in this session. Each is only kept when the
// response is a real (non-redirected) HTML page — a signed-out install gets
// middleware's /auth redirect and simply skips them.
const CORE_ROUTES = ["/dashboard", "/habits", "/grooming"];

// Content-addressed or effectively immutable assets: cache-first.
const STATIC_PREFIXES = [
  "/_next/static/",
  "/mediapipe/",
  "/icons/",
  "/test-faces/",
  "/favicon.svg",
];

// True when registered from `next dev` (see ServiceWorkerRegister).
const IS_DEV = new URL(self.location.href).searchParams.has("dev");

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function putIfFresh(cache, key, res) {
  if (res.ok && res.status === 200 && !res.redirected) {
    try {
      await cache.put(key, res.clone());
    } catch {
      /* quota exceeded / body already consumed — offline just won't have it */
    }
  }
}

/* ------------------------------------------------------------------ */
/* Install: offline fallback page + core route precache                */
/* ------------------------------------------------------------------ */

self.addEventListener("install", (event) => {
  event.waitUntil(precache());
});

async function precache() {
  // The offline page first — it must exist even if route precaching fails.
  try {
    const res = await fetch(OFFLINE_URL, { cache: "no-store" });
    if (res.ok) {
      const pages = await caches.open(PAGES_CACHE);
      await pages.put(OFFLINE_URL, res.clone());
      await cacheAssetsInHtml(await res.text());
    }
  } catch {
    /* offline during install — runtime network-first still handles it */
  }

  await Promise.allSettled(CORE_ROUTES.map(precacheRoute));
  await self.skipWaiting();
}

async function precacheRoute(route) {
  let res;
  try {
    res = await fetch(route, { credentials: "include" });
  } catch {
    return;
  }
  // A redirect means middleware bounced us (signed out / onboarding) — the
  // visitor's own navigation will cache whatever they actually land on.
  if (!res.ok || res.redirected) return;
  const type = res.headers.get("content-type") || "";
  if (!type.includes("text/html")) return;

  const html = await res.text();
  const pages = await caches.open(PAGES_CACHE);
  await pages.put(route, new Response(html, { headers: res.headers }));
  await cacheAssetsInHtml(html);
}

// Pull /_next/static chunk + CSS URLs out of a rendered HTML document and
// cache them, so a precached page has everything it needs to boot offline.
async function cacheAssetsInHtml(html) {
  const matches = html.match(/\/_next\/static\/[^"'\\\s<>)]+/g);
  if (!matches) return;
  const assets = await caches.open(ASSETS_CACHE);
  await Promise.allSettled(
    [...new Set(matches)].map(async (path) => {
      const url = new URL(path, self.location.origin).href;
      if (await assets.match(url)) return;
      const res = await fetch(url);
      await putIfFresh(assets, url, res);
    }),
  );
}

/* ------------------------------------------------------------------ */
/* Activate: drop caches from older versions, take control            */
/* ------------------------------------------------------------------ */

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("chizle-") && !key.endsWith(VERSION))
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

/* ------------------------------------------------------------------ */
/* Fetch strategies                                                    */
/* ------------------------------------------------------------------ */

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Cross-origin (Supabase auth/DB, Amazon links, …) stays on the network.
  if (url.origin !== self.location.origin) return;

  // App Router data + prefetch requests: network only, see header comment.
  if (request.headers.get("RSC") === "1") return;

  const isNavigation = request.mode === "navigate";
  const isStatic =
    !IS_DEV &&
    STATIC_PREFIXES.some(
      (prefix) => url.pathname === prefix || url.pathname.startsWith(prefix),
    );

  event.respondWith(
    isStatic ? cacheFirst(request) : networkFirst(request, isNavigation),
  );
});

// Cache-first for immutable assets; first request fills the cache.
async function cacheFirst(request) {
  const cache = await caches.open(ASSETS_CACHE);
  const cached = await cache.match(request, { ignoreVary: true });
  if (cached) return cached;

  const res = await fetch(request);
  await putIfFresh(cache, request, res.clone());
  return res;
}

// Network-first with a short timeout: fresh when the network is healthy,
// cached copy when it's slow or down, /offline when a page has no cache.
async function networkFirst(request, isNavigation) {
  const cache = await caches.open(isNavigation ? PAGES_CACHE : ASSETS_CACHE);

  const networkPromise = fetch(request).then(async (res) => {
    await putIfFresh(cache, request, res.clone());
    return res;
  });
  // Prevent an unhandled rejection when we walk away from the promise.
  networkPromise.catch(() => {});

  const raced = await Promise.race([
    networkPromise.catch(() => null),
    delay(NETWORK_TIMEOUT_MS),
  ]);
  if (raced) return raced;

  // Slow connection: prefer the cached copy; the network keeps refreshing
  // the cache in the background for the next load.
  const cached = await cache.match(request, { ignoreVary: true });
  if (cached) return cached;

  // Nothing cached yet — keep waiting on the network rather than failing.
  try {
    return await networkPromise;
  } catch (err) {
    if (isNavigation) return offlinePage();
    throw err;
  }
}

async function offlinePage() {
  const cache = await caches.open(PAGES_CACHE);
  const cached = await cache.match(OFFLINE_URL, { ignoreVary: true });
  if (cached) return cached;
  // Last-resort plain response in case install couldn't precache /offline.
  return new Response(
    '<!doctype html><html lang="en"><meta charset="utf-8"><title>Offline</title>' +
      '<body style="font-family:system-ui;display:grid;place-items:center;height:100vh;margin:0">' +
      "<p>You're offline. Reconnect and try again.</p></body></html>",
    { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}
