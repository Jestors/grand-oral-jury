// Service worker du Simulateur Grand Oral
// Rôle : rendre l'app installable et afficher une page propre hors connexion.
// Il ne met JAMAIS en cache les appels API, Stripe ou Supabase.
 
const VERSION = "go-v1";
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/icon-192.png", "/icon-512.png"];
 
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});
 
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});
 
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
 
  const url = new URL(req.url);
 
  // Autres domaines (Stripe, Supabase, Anthropic...) : on ne touche à rien
  if (url.origin !== self.location.origin) return;
 
  // Routes API : toujours le réseau, jamais de cache
  if (url.pathname.startsWith("/api/")) return;
 
  // Pages : réseau d'abord, page hors ligne si pas de connexion
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }
 
  // Fichiers statiques de Next.js (noms uniques) : cache d'abord
  if (url.pathname.startsWith("/_next/static/") || url.pathname.endsWith(".png")) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(VERSION).then((cache) => cache.put(req, copy));
            }
            return res;
          })
      )
    );
  }
});
 
