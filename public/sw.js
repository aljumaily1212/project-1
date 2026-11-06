// Al-Rahma offline helper: a "service worker", a small script the browser runs in the background for this site.
// - Pages and the site's own files are kept after each visit, so the site still opens without internet.
// - API data, only GET (reading), keeps the last answer for each address, so lists still show the last loaded data
//   offline. Saving, booking or paying is never answered from here: those always need the server.
// The site deletes the API copies on sign-out (clearSession in lib/auth.ts), so the next person on a shared
// computer can't see them. Registered from components/offline-bar.tsx, only on the built site.

const PAGES = "alrahma-pages-v1";
const API = "alrahma-api";
// The API's address comes from the registration (sw.js?api=https://...), so it follows the site's .env.
const API_ORIGIN = new URL(self.location.href).searchParams.get("api") || "";

const OFFLINE_PAGE = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>لا يوجد اتصال</title></head>
<body style="font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;padding:16px;background:#f8fafc;color:#0f172a;text-align:center">
<div><h1 style="font-size:20px">لا يوجد اتصال بالإنترنت</h1>
<p>هذه الصفحة لم تُفتح من قبل على هذا الجهاز. افتحها مرة واحدة مع الإنترنت لتعمل بدونه.</p>
<p dir="ltr">No internet. This page was never opened on this device. Open it once while online and it will work offline.</p></div></body></html>`;

// A new version of this file starts clean: old page copies are removed, and it takes over open tabs at once.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) if (name.startsWith("alrahma-pages-") && name !== PAGES) await caches.delete(name);
      await self.clients.claim();
    })(),
  );
});

// Internet first, so online users always get fresh data. When the internet fails: the last saved copy.
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch (err) {
    const saved = await cache.match(request);
    if (saved) return saved;
    throw err;
  }
}

// Files under /_next/static/ get a new name whenever they change, so a saved copy is never out of date.
async function cacheFirst(request) {
  const cache = await caches.open(PAGES);
  const saved = await cache.match(request);
  if (saved) return saved;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  // Only reading. Anything that changes data goes straight to the server, untouched.
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith("/_next/static/")) {
      event.respondWith(cacheFirst(request));
    } else if (request.mode === "navigate") {
      event.respondWith(
        networkFirst(request, PAGES).catch(() => new Response(OFFLINE_PAGE, { headers: { "Content-Type": "text/html; charset=utf-8" } })),
      );
    } else {
      event.respondWith(networkFirst(request, PAGES));
    }
    return;
  }

  if (API_ORIGIN && url.origin === API_ORIGIN) event.respondWith(networkFirst(request, API));
});
