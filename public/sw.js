// Service worker minimal : rend l'app installable (PWA) sans cache agressif,
// pour éviter de servir du contenu périmé (l'app est très dynamique).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
// Un handler fetch (même passe-plat) est nécessaire au critère d'installabilité.
self.addEventListener("fetch", () => {});
