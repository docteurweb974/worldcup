"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { importPredictions } from "@/app/predictions/actions";
import { isValidPrediction } from "@/lib/predictions";

/** Bannière de migration : importe les pronostics du localStorage (V1) vers la DB. */
export function ImportLocalPredictions() {
  const router = useRouter();
  const [items, setItems] = useState<{ matchId: number; home: number; away: number }[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("predictions");
      if (!raw) return;
      const obj = JSON.parse(raw) as Record<string, unknown>;
      const arr = Object.entries(obj)
        .filter(([, v]) => isValidPrediction(v))
        .map(([k, v]) => {
          const score = v as { home: number; away: number };
          return { matchId: Number(k), home: score.home, away: score.away };
        });
      setItems(arr);
    } catch {
      // localStorage indisponible ou JSON corrompu : rien à importer.
    }
  }, []);

  if (done) {
    return (
      <p className="rounded-xl bg-accent-soft p-3 text-center text-sm text-accent">{done}</p>
    );
  }
  if (items.length === 0) return null;

  const onImport = async () => {
    setBusy(true);
    const res = await importPredictions(items);
    setBusy(false);
    if ("error" in res) {
      setDone(res.error);
      return;
    }
    try {
      window.localStorage.removeItem("predictions");
    } catch {
      /* ignore */
    }
    setItems([]);
    setDone(
      `${res.imported} pronostic(s) importé(s)${res.skipped ? `, ${res.skipped} ignoré(s) (match déjà commencé)` : ""}.`,
    );
    router.refresh();
  };

  return (
    <div className="rounded-2xl border border-accent/40 bg-accent-soft p-4">
      <p className="text-sm font-medium">
        Tu as {items.length} pronostic(s) enregistré(s) sur cet appareil (V1).
      </p>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
        Importe-les sur ton compte pour qu&apos;ils comptent au classement.
      </p>
      <button
        type="button"
        onClick={onImport}
        disabled={busy}
        className="mt-3 min-h-tap cursor-pointer rounded-xl bg-cta px-5 font-semibold text-cta-fg transition hover:brightness-110 disabled:opacity-50"
      >
        {busy ? "Import…" : "Importer mes pronos"}
      </button>
    </div>
  );
}
