// Service worker minimal : rend l'app installable (PWA) et met en cache
// le shell applicatif. Les notifications push du reset quotidien viendront
// s'ajouter ici (roadmap §8, étape 7).
const CACHE = "life-shell-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(["/"])));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.pathname.startsWith("/api")) return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request).then((r) => r ?? caches.match("/")))
  );
});

// Notification push du reset quotidien (brief §6).
self.addEventListener("push", (event) => {
  let data = { title: "LIFE", body: "Tes 5 Tournants du jour t'attendent." };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    /* payload non-JSON : on garde le texte par défaut */
  }
  event.waitUntil(self.registration.showNotification(data.title, { body: data.body }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      const ouvert = clients.find((c) => "focus" in c);
      return ouvert ? ouvert.focus() : self.clients.openWindow("/");
    })
  );
});
