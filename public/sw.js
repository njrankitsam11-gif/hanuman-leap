/* global self, caches, fetch, Response, URL */
/*
 * Offline support for Hanuman's Leap.
 *
 * Registered as /sw.js?v=<build id>, so every deploy is a new script URL and
 * installs a fresh worker. Two caches:
 *   - shell-<v>: "/" and the small static files, refilled per version
 *   - assets-<v>: hashed /assets/* (immutable), filled as the page requests them
 * On install the shell HTML is fetched and every /assets/ URL it (and its CSS)
 * mentions is cached too, so one online visit is enough to play offline later.
 */

const VERSION = new URL(self.location.href).searchParams.get("v") || "dev";
const SHELL = `shell-${VERSION}`;
const ASSETS = `assets-${VERSION}`;
const KEEP = new Set([SHELL, ASSETS]);

const STATIC = [
  "/",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
];

/** How long a navigation may wait on the network before the cached shell is served. */
const NAV_TIMEOUT_MS = 4000;

const ASSET_RE = /\/assets\/[A-Za-z0-9_.\-]+/g;

async function cacheReferencedAssets(shell, assets) {
  const res = await shell.match("/");
  if (!res) return;
  const html = await res.text();
  const urls = new Set(html.match(ASSET_RE) || []);
  // fonts and images referenced from the stylesheet(s)
  for (const url of [...urls]) {
    if (!url.endsWith(".css")) continue;
    try {
      const css = await (await fetch(url)).text();
      for (const u of css.match(ASSET_RE) || []) urls.add(u);
    } catch {
      /* best effort */
    }
  }
  await Promise.all(
    [...urls].map((url) =>
      assets.match(url).then((hit) => (hit ? undefined : assets.add(url).catch(() => {}))),
    ),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const shell = await caches.open(SHELL);
      await Promise.all(STATIC.map((u) => shell.add(u).catch(() => {})));
      const assets = await caches.open(ASSETS);
      await cacheReferencedAssets(shell, assets);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => !KEEP.has(n)).map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

async function handleNavigation(request) {
  const shell = await caches.open(SHELL);
  try {
    const res = await withTimeout(fetch(request), NAV_TIMEOUT_MS);
    // only the game itself is the offline shell, not /privacy
    if (res.ok && new URL(request.url).pathname === "/") {
      shell.put("/", res.clone()).catch(() => {});
    }
    return res;
  } catch {
    const cached = await shell.match("/");
    return cached || Response.error();
  }
}

async function cacheFirst(cacheName, request) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone()).catch(() => {});
  return res;
}

async function staleWhileRevalidate(cacheName, request) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  const refresh = fetch(request)
    .then((res) => {
      if (res.ok) cache.put(request, res.clone()).catch(() => {});
      return res;
    })
    .catch(() => undefined);
  return hit || (await refresh) || Response.error();
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(cacheFirst(ASSETS, request));
    return;
  }
  if (STATIC.includes(url.pathname) || url.pathname.startsWith("/icons/")) {
    event.respondWith(staleWhileRevalidate(SHELL, request));
  }
});
