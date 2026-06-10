"use client";

import { useEffect } from "react";

/** Enregistre le service worker pour rendre l'app installable (PWA). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* enregistrement échoué : l'app reste utilisable, simplement non installable */
      });
    }
  }, []);
  return null;
}
