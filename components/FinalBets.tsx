"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { saveFinalBets } from "@/app/final-bets/actions";
import type {
  FinalBets as Bets,
  Half,
  OverUnder,
  Btts,
  HtResult,
  FinalBetsData,
} from "@/lib/final-bets";

const FINAL_BET_POINTS = 3; // aligné sur lib/final-bets (module server-only)

type Variant = "card" | "glass";

/** Bloc d'un pari bonus : titre + pastille +3 + options en boutons. */
function BonusBlock<T extends string>({
  emoji,
  title,
  hint,
  options,
  value,
  onChange,
  disabled,
  actual,
  cols = 3,
  glass = false,
}: {
  emoji: string;
  title: string;
  hint?: string;
  options: { key: T; label: string }[];
  value: T | null;
  onChange: (v: T | null) => void;
  disabled?: boolean;
  actual?: T | null; // issue réelle (mode résultat)
  cols?: 2 | 3;
  glass?: boolean;
}) {
  const resolved = actual != null;
  return (
    <div
      className={`rounded-xl border p-3 ${
        glass ? "border-white/15 bg-white/5" : "border-neutral-200 dark:border-neutral-800"
      }`}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="text-base">{emoji}</span>
        <p className={`text-sm font-semibold ${glass ? "text-white" : ""}`}>{title}</p>
        <span
          className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold ${
            glass
              ? "bg-amber-400/20 text-amber-200"
              : "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300"
          }`}
        >
          +{FINAL_BET_POINTS} pts
        </span>
      </div>
      {hint && !resolved && (
        <p className={`mb-2 text-xs ${glass ? "text-white/50" : "text-neutral-400"}`}>{hint}</p>
      )}
      <div className={`grid gap-2 ${cols === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
        {options.map((o) => {
          const picked = value === o.key;
          const isActual = actual === o.key;
          let cls = glass
            ? "border-white/20 bg-white/5 text-white hover:bg-white/10"
            : "border-neutral-300 bg-white hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800";
          if (resolved) {
            if (picked && isActual)
              cls = glass
                ? "border-green-400 bg-green-500/20 text-green-200"
                : "border-green-500 bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300";
            else if (picked && !isActual)
              cls = glass
                ? "border-red-400 bg-red-500/20 text-red-200 line-through"
                : "border-red-400 bg-red-50 text-red-600 line-through dark:bg-red-500/10 dark:text-red-300";
            else if (isActual)
              cls = glass ? "border-green-400 text-green-200" : "border-green-500 text-green-700 dark:text-green-300";
            else cls = glass ? "border-white/10 text-white/40" : "border-neutral-200 text-neutral-400 dark:border-neutral-800";
          } else if (picked) {
            cls = glass
              ? "border-amber-300 bg-amber-400 text-neutral-900"
              : "border-accent bg-accent text-white";
          }
          return (
            <button
              key={o.key}
              type="button"
              disabled={disabled || resolved}
              aria-pressed={picked}
              onClick={() => onChange(picked ? null : o.key)}
              className={`min-h-tap rounded-lg border px-2 py-2 text-sm font-medium transition active:scale-[0.98] disabled:cursor-default ${cls}`}
            >
              {o.label}
              {resolved && isActual && <span className="ml-1">✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function FinalBets({
  data,
  isLoggedIn,
  variant = "card",
}: {
  data: FinalBetsData;
  isLoggedIn: boolean;
  variant?: Variant;
}) {
  const router = useRouter();
  const { home, away } = data;
  const g = variant === "glass";

  const [half, setHalf] = useState<Half | null>(data.myBets.half);
  const [ou, setOu] = useState<OverUnder | null>(data.myBets.overUnder);
  const [btts, setBtts] = useState<Btts | null>(data.myBets.btts);
  const [ht, setHt] = useState<HtResult | null>(data.myBets.htResult);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (!data.available || !home || !away) return null;

  const resolved = data.finished && data.outcomes != null;
  const editable = !data.locked && isLoggedIn;
  const bonusCount = [half, ou, btts, ht].filter(Boolean).length;

  const halfOpts = [
    { key: "first" as const, label: "1re MT" },
    { key: "equal" as const, label: "Égalité" },
    { key: "second" as const, label: "2e MT" },
  ];
  const ouOpts = [
    { key: "over" as const, label: "Plus de 2,5" },
    { key: "under" as const, label: "Moins de 2,5" },
  ];
  const bttsOpts = [
    { key: "yes" as const, label: "Oui" },
    { key: "no" as const, label: "Non" },
  ];
  const htOpts = [
    { key: "home" as const, label: `${home.flag} ${home.fr}` },
    { key: "draw" as const, label: "Nul" },
    { key: "away" as const, label: `${away.flag} ${away.fr}` },
  ];

  const onSave = async () => {
    setSaving(true);
    setError(null);
    const bets: Bets = { half, overUnder: ou, btts, htResult: ht };
    const res = await saveFinalBets(bets);
    setSaving(false);
    if (res?.error) setError(res.error);
    else {
      setSaved(true);
      router.refresh();
    }
  };

  const dirty =
    half !== data.myBets.half ||
    ou !== data.myBets.overUnder ||
    btts !== data.myBets.btts ||
    ht !== data.myBets.htResult;

  return (
    <section
      className={
        g
          ? "rounded-2xl border border-white/15 bg-black/20 p-4"
          : "mx-auto max-w-xl rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800"
      }
    >
      <div className="mb-1 flex items-center justify-between">
        <h2 className={`font-bold ${g ? "text-white" : ""}`}>Paris bonus de la finale 🎁</h2>
        {resolved ? (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-bold ${
              g ? "bg-violet-400/25 text-violet-100" : "bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300"
            }`}
          >
            +{data.myPoints ?? 0} pts
          </span>
        ) : (
          <span className={`text-xs ${g ? "text-white/50" : "text-neutral-400"}`}>
            {bonusCount}/4 · jusqu’à +12 pts
          </span>
        )}
      </div>
      <p className={`mb-3 text-xs ${g ? "text-white/60" : "text-neutral-500"}`}>
        {resolved
          ? "Résultat de tes paris bonus (jugés sur le score à la mi-temps et à 90')."
          : "4 paris facultatifs, +3 pts chacun. En plus de ton pronostic de score."}
      </p>

      {!resolved && !isLoggedIn && (
        <Link
          href="/connexion"
          className={`mb-3 block rounded-xl border border-dashed p-4 text-center text-sm ${
            g ? "border-white/30 text-white/90" : "border-neutral-300 dark:border-neutral-700"
          }`}
        >
          Connecte-toi pour jouer les paris bonus.
        </Link>
      )}

      <div className="space-y-2">
        <BonusBlock
          emoji="🔥"
          title="Mi-temps la plus prolifique"
          hint="Dans quelle période le plus de buts ?"
          options={halfOpts}
          value={half}
          onChange={setHalf}
          disabled={!editable}
          actual={resolved ? data.outcomes!.half : undefined}
          glass={g}
        />
        <BonusBlock
          emoji="🎯"
          title="Nombre de buts"
          options={ouOpts}
          value={ou}
          onChange={setOu}
          disabled={!editable}
          actual={resolved ? data.outcomes!.overUnder : undefined}
          cols={2}
          glass={g}
        />
        <BonusBlock
          emoji="🤝"
          title="Les deux équipes marquent"
          options={bttsOpts}
          value={btts}
          onChange={setBtts}
          disabled={!editable}
          actual={resolved ? data.outcomes!.btts : undefined}
          cols={2}
          glass={g}
        />
        <BonusBlock
          emoji="⏱️"
          title="Résultat à la mi-temps"
          options={htOpts}
          value={ht}
          onChange={setHt}
          disabled={!editable}
          actual={resolved ? data.outcomes!.htResult : undefined}
          glass={g}
        />
      </div>

      {!resolved && data.locked && (
        <p className={`mt-3 text-center text-xs ${g ? "text-white/50" : "text-neutral-400"}`}>
          🔒 La finale a commencé — paris verrouillés.
        </p>
      )}

      {editable && (
        <>
          {error && (
            <p role="alert" className={`mt-2 text-center text-sm ${g ? "text-red-300" : "text-red-600 dark:text-red-400"}`}>
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={onSave}
            disabled={saving || (!dirty && saved)}
            className="mt-3 min-h-tap w-full rounded-xl bg-cta text-sm font-semibold text-cta-fg transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
          >
            {saving
              ? "Enregistrement…"
              : dirty
                ? "Enregistrer mes paris bonus"
                : "✓ Paris enregistrés"}
          </button>
        </>
      )}
    </section>
  );
}
