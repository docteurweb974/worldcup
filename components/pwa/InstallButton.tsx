"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function Step({ n }: { n: number }) {
  return (
    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-white">
      {n}
    </span>
  );
}

/** Icône « Partager » d'iOS (carré ouvert + flèche vers le haut). */
function ShareIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="inline h-5 w-5 text-blue-500"
      aria-hidden="true"
    >
      <path d="M12 3v12" />
      <path d="M8 7l4-4 4 4" />
      <path d="M7 11H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1" />
    </svg>
  );
}

/** Icône « Sur l'écran d'accueil » (carré arrondi + plus). */
function AddIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="inline h-5 w-5"
      aria-hidden="true"
    >
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <path d="M12 9v6M9 12h6" />
    </svg>
  );
}

export function InstallButton() {
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [busy, setBusy] = useState(false);
  const [noPrompt, setNoPrompt] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as { standalone?: boolean }).standalone === true;
    if (standalone) {
      setInstalled(true);
      return;
    }
    setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const onInstalled = () => setInstalled(true);
    window.addEventListener("bip-installed", onInstalled);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("bip-installed", onInstalled);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    const bip = (window as unknown as { __bip?: BeforeInstallPromptEvent }).__bip;
    if (!bip) {
      setNoPrompt(true);
      return;
    }
    setBusy(true);
    try {
      await bip.prompt();
      const { outcome } = await bip.userChoice;
      if (outcome === "accepted") setInstalled(true);
      (window as unknown as { __bip?: BeforeInstallPromptEvent | null }).__bip = null;
    } finally {
      setBusy(false);
    }
  };

  if (installed) return null;

  return (
    <section className="space-y-3 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-bold">Installer l’app</h2>
          <p className="text-sm text-neutral-500">
            Ajoute l’application à ton écran d’accueil pour un accès direct.
          </p>
        </div>
        {!isIos && (
          <button
            type="button"
            onClick={install}
            disabled={busy}
            className="min-h-tap shrink-0 rounded-full bg-accent px-5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "…" : "Ajouter"}
          </button>
        )}
      </div>

      {isIos && (
        <div className="space-y-3 rounded-xl bg-accent-soft p-3">
          <p className="text-sm font-semibold">Sur iPhone / iPad, en 2 étapes (dans Safari) :</p>
          <ol className="space-y-3">
            <li className="flex items-center gap-3">
              <Step n={1} />
              <span className="flex flex-wrap items-center gap-1.5 text-sm">
                Appuie sur <ShareIcon /> <b>Partager</b> en bas de l’écran
              </span>
            </li>
            <li className="flex items-center gap-3">
              <Step n={2} />
              <span className="flex flex-wrap items-center gap-1.5 text-sm">
                Choisis <AddIcon /> <b>« Sur l’écran d’accueil »</b>
              </span>
            </li>
          </ol>
        </div>
      )}
      {noPrompt && (
        <p className="text-sm text-neutral-500">
          L’app est peut-être déjà installée, ou ton navigateur ne propose pas l’installation
          automatique. Ouvre le menu <b>⋮</b> du navigateur → <b>« Installer World Cup Fun »</b>.
        </p>
      )}
    </section>
  );
}
