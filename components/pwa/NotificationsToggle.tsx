"use client";

import { useEffect, useState } from "react";
import { savePushSubscription, deletePushSubscription } from "@/app/notifications/actions";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

type State = "loading" | "unsupported" | "ios-install" | "on" | "off" | "denied";

export function NotificationsToggle() {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    if (!supported) {
      const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as { standalone?: boolean }).standalone === true;
      setState(isIos && !standalone ? "ios-install" : "unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setState(sub ? "on" : "off"))
      .catch(() => setState("off"));
  }, []);

  const enable = async () => {
    setBusy(true);
    setError(null);
    try {
      if (!VAPID_PUBLIC) throw new Error("clé VAPID publique absente (redémarre le serveur)");
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
      });
      const res = await savePushSubscription(sub.toJSON() as never);
      if (!res.ok) throw new Error(res.error || "enregistrement refusé");
      setState("on");
    } catch (e) {
      console.error("[push] activation:", e);
      const msg = e instanceof Error ? e.message : String(e);
      const hint = /push service/i.test(msg)
        ? " — ton navigateur ne peut pas joindre son service push. Sur Brave : active les services Google de push dans les réglages. Sinon essaie Chrome ou Edge."
        : "";
      setError(`Activation impossible : ${msg}${hint}`);
      setState("off");
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await deletePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
    } catch {
      setError("Désactivation impossible. Réessaie.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-3 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-bold">Notifications</h2>
          <p className="text-sm text-neutral-500">
            Reçois un rappel avant la clôture des pronos du jour.
          </p>
        </div>
        {(state === "on" || state === "off") && (
          <button
            type="button"
            onClick={state === "on" ? disable : enable}
            disabled={busy}
            className={`min-h-tap shrink-0 rounded-full px-4 text-sm font-semibold transition-colors disabled:opacity-50 ${
              state === "on"
                ? "border border-neutral-300 dark:border-neutral-700"
                : "bg-accent text-white"
            }`}
          >
            {busy ? "…" : state === "on" ? "Désactiver" : "Activer"}
          </button>
        )}
      </div>

      {state === "loading" && <p className="text-sm text-neutral-400">Chargement…</p>}
      {state === "on" && (
        <p className="text-sm font-medium text-green-600 dark:text-green-400">
          ✅ Notifications activées sur cet appareil.
        </p>
      )}
      {state === "denied" && (
        <p className="text-sm text-neutral-500">
          Les notifications sont bloquées dans les réglages de ton navigateur. Autorise-les pour
          World Cup Fun, puis recharge la page.
        </p>
      )}
      {state === "ios-install" && (
        <p className="text-sm text-neutral-500">
          📲 Sur iPhone : appuie sur <b>Partager</b> puis <b>« Sur l’écran d’accueil »</b> pour
          installer l’app, puis reviens ici activer les notifications.
        </p>
      )}
      {state === "unsupported" && (
        <p className="text-sm text-neutral-500">
          Ce navigateur ne gère pas les notifications. Essaie Chrome ou Firefox.
        </p>
      )}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </section>
  );
}
