"use client";
/* Démo temporaire : 2 propositions de sélection du champion. À supprimer après choix. */

import { useState } from "react";

interface T {
  id: number;
  name: string;
  flag: string;
  code: string;
  out?: boolean;
  won?: boolean;
}
interface M {
  home: T;
  away: T;
}

// Données d'exemple = le tableau de référence (16es). 4 résultats connus.
const LEFT: M[] = [
  { home: { id: 1, name: "Allemagne", flag: "🇩🇪", code: "ALL", out: true }, away: { id: 2, name: "Paraguay", flag: "🇵🇾", code: "PAR", won: true } },
  { home: { id: 3, name: "France", flag: "🇫🇷", code: "FRA" }, away: { id: 4, name: "Suède", flag: "🇸🇪", code: "SUE" } },
  { home: { id: 5, name: "Afrique du Sud", flag: "🇿🇦", code: "AFS", out: true }, away: { id: 6, name: "Canada", flag: "🇨🇦", code: "CAN", won: true } },
  { home: { id: 7, name: "Pays-Bas", flag: "🇳🇱", code: "P-B", out: true }, away: { id: 8, name: "Maroc", flag: "🇲🇦", code: "MAR", won: true } },
  { home: { id: 9, name: "Portugal", flag: "🇵🇹", code: "POR" }, away: { id: 10, name: "Croatie", flag: "🇭🇷", code: "CRO" } },
  { home: { id: 11, name: "Espagne", flag: "🇪🇸", code: "ESP" }, away: { id: 12, name: "Autriche", flag: "🇦🇹", code: "AUT" } },
  { home: { id: 13, name: "États-Unis", flag: "🇺🇸", code: "USA" }, away: { id: 14, name: "Bosnie", flag: "🇧🇦", code: "BOS" } },
  { home: { id: 15, name: "Belgique", flag: "🇧🇪", code: "BEL" }, away: { id: 16, name: "Sénégal", flag: "🇸🇳", code: "SEN" } },
];
const RIGHT: M[] = [
  { home: { id: 17, name: "Brésil", flag: "🇧🇷", code: "BRE", won: true }, away: { id: 18, name: "Japon", flag: "🇯🇵", code: "JAP", out: true } },
  { home: { id: 19, name: "Côte d'Ivoire", flag: "🇨🇮", code: "CIV" }, away: { id: 20, name: "Norvège", flag: "🇳🇴", code: "NOR" } },
  { home: { id: 21, name: "Mexique", flag: "🇲🇽", code: "MEX" }, away: { id: 22, name: "Équateur", flag: "🇪🇨", code: "EQU" } },
  { home: { id: 23, name: "Angleterre", flag: "🏴", code: "ANG" }, away: { id: 24, name: "RD Congo", flag: "🇨🇩", code: "RDC" } },
  { home: { id: 25, name: "Argentine", flag: "🇦🇷", code: "ARG" }, away: { id: 26, name: "Cap-Vert", flag: "🇨🇻", code: "CPV" } },
  { home: { id: 27, name: "Australie", flag: "🇦🇺", code: "AUS" }, away: { id: 28, name: "Égypte", flag: "🇪🇬", code: "EGY" } },
  { home: { id: 29, name: "Suisse", flag: "🇨🇭", code: "SUI" }, away: { id: 30, name: "Algérie", flag: "🇩🇿", code: "ALG" } },
  { home: { id: 31, name: "Colombie", flag: "🇨🇴", code: "COL" }, away: { id: 32, name: "Ghana", flag: "🇬🇭", code: "GHA" } },
];
const ALL_TEAMS = [...LEFT, ...RIGHT].flatMap((m) => [m.home, m.away]);

// ───────────────────── Option 1 — Tableau 2 côtés ─────────────────────
function SideMatch({ m, sel, onPick, align }: { m: M; sel: number | null; onPick: (id: number) => void; align: "left" | "right" }) {
  const Chip = ({ t }: { t: T }) => {
    const isSel = t.id === sel;
    const clickable = !t.out;
    return (
      <button
        type="button"
        disabled={!clickable}
        onClick={() => onPick(t.id)}
        className={`flex w-full items-center gap-1 px-1.5 py-1 text-[11px] font-semibold transition ${
          align === "right" ? "flex-row-reverse text-right" : ""
        } ${
          isSel ? "bg-accent text-white" : t.out ? "text-neutral-400 line-through" : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
        }`}
      >
        <span className="text-sm">{t.flag}</span>
        <span className="flex-1 truncate">{t.code}</span>
        {t.won && !isSel && <span className="text-green-600 dark:text-green-400">✓</span>}
      </button>
    );
  };
  return (
    <div className="overflow-hidden rounded-md border border-neutral-200 dark:border-neutral-800">
      <Chip t={m.home} />
      <div className="h-px bg-neutral-200 dark:bg-neutral-800" />
      <Chip t={m.away} />
    </div>
  );
}

function OptionTwoSided() {
  const [sel, setSel] = useState<number | null>(null);
  return (
    <div className="rounded-2xl border border-neutral-200 p-3 dark:border-neutral-800">
      <div className="flex items-stretch gap-2">
        <div className="flex flex-1 flex-col justify-between gap-1.5">
          {LEFT.map((m, i) => (
            <SideMatch key={i} m={m} sel={sel} onPick={setSel} align="left" />
          ))}
        </div>
        <div className="flex w-14 flex-col items-center justify-center gap-2 text-center">
          <span className="text-[10px] font-bold uppercase text-neutral-400">Finale</span>
          <span className="text-3xl">🏆</span>
        </div>
        <div className="flex flex-1 flex-col justify-between gap-1.5">
          {RIGHT.map((m, i) => (
            <SideMatch key={i} m={m} sel={sel} onPick={setSel} align="right" />
          ))}
        </div>
      </div>
      <p className="mt-3 text-center text-sm">
        {sel ? (
          <>Champion : <b>{ALL_TEAMS.find((t) => t.id === sel)?.flag} {ALL_TEAMS.find((t) => t.id === sel)?.name}</b></>
        ) : (
          <span className="text-neutral-400">Clique une équipe</span>
        )}
      </p>
    </div>
  );
}

const winnerOf = (m: M): T | null => (m.home.won ? m.home : m.away.won ? m.away : null);
const pick = (sel: number | null) => ALL_TEAMS.find((t) => t.id === sel);
const Result = ({ sel }: { sel: number | null }) => (
  <p className="mt-3 text-center text-sm">
    {sel ? (
      <>Champion : <b>{pick(sel)?.flag} {pick(sel)?.name}</b></>
    ) : (
      <span className="text-neutral-400">Clique une équipe</span>
    )}
  </p>
);

// ───────────── Option 3 — Bracket élargi (16es + 8es) ─────────────
function Mini({ t, sel, onPick, right }: { t: T | null; sel: number | null; onPick: (id: number) => void; right?: boolean }) {
  if (!t) return <span className="px-1.5 py-1 text-[11px] text-neutral-300 dark:text-neutral-600">—</span>;
  const isSel = t.id === sel;
  return (
    <button
      type="button"
      disabled={!!t.out}
      onClick={() => onPick(t.id)}
      className={`flex items-center gap-1 px-1.5 py-1 text-[11px] font-semibold ${right ? "flex-row-reverse" : ""} ${
        isSel ? "bg-accent text-white" : t.out ? "text-neutral-400 line-through" : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
      }`}
    >
      <span className="text-sm">{t.flag}</span>
      <span>{t.code}</span>
    </button>
  );
}
function Pair({ a, b, sel, onPick, right }: { a: T | null; b: T | null; sel: number | null; onPick: (id: number) => void; right?: boolean }) {
  return (
    <div className="overflow-hidden rounded-md border border-neutral-200 dark:border-neutral-800">
      <Mini t={a} sel={sel} onPick={onPick} right={right} />
      <div className="h-px bg-neutral-200 dark:bg-neutral-800" />
      <Mini t={b} sel={sel} onPick={onPick} right={right} />
    </div>
  );
}
function OptionExpanded() {
  const [sel, setSel] = useState<number | null>(null);
  const col8 = (ms: M[]) =>
    [0, 2, 4, 6].map((i) => ({ a: winnerOf(ms[i]), b: winnerOf(ms[i + 1]) }));
  return (
    <div className="rounded-2xl border border-neutral-200 p-2 dark:border-neutral-800">
      <div className="-mx-2 overflow-x-auto px-2">
        <div className="flex min-w-[520px] items-stretch gap-1">
          <div className="flex flex-1 flex-col justify-between gap-1">{LEFT.map((m, i) => <Pair key={i} a={m.home} b={m.away} sel={sel} onPick={setSel} />)}</div>
          <div className="flex w-16 flex-col justify-around gap-1">{col8(LEFT).map((p, i) => <Pair key={i} a={p.a} b={p.b} sel={sel} onPick={setSel} />)}</div>
          <div className="flex w-12 flex-col items-center justify-center gap-1"><span className="text-[9px] font-bold uppercase text-neutral-400">Finale</span><span className="text-2xl">🏆</span></div>
          <div className="flex w-16 flex-col justify-around gap-1">{col8(RIGHT).map((p, i) => <Pair key={i} a={p.a} b={p.b} sel={sel} onPick={setSel} right />)}</div>
          <div className="flex flex-1 flex-col justify-between gap-1">{RIGHT.map((m, i) => <Pair key={i} a={m.home} b={m.away} sel={sel} onPick={setSel} right />)}</div>
        </div>
      </div>
      <Result sel={sel} />
    </div>
  );
}

// ───────────── Option 4 — Cartes premium ─────────────
function PremiumSide({ ms, sel, onPick, right }: { ms: M[]; sel: number | null; onPick: (id: number) => void; right?: boolean }) {
  const Row = ({ t }: { t: T }) => {
    const isSel = t.id === sel;
    return (
      <button
        type="button"
        disabled={!!t.out}
        onClick={() => onPick(t.id)}
        className={`flex items-center gap-2 px-2.5 py-2 text-xs font-semibold transition ${right ? "flex-row-reverse text-right" : ""} ${
          isSel ? "bg-accent text-white" : t.won ? "bg-green-50 dark:bg-green-500/10" : t.out ? "text-neutral-400 line-through" : "hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
        }`}
      >
        <span className="text-base">{t.flag}</span>
        <span className="flex-1 truncate">{t.code}</span>
        {t.won && !isSel && <span className="text-green-600 dark:text-green-400">✓</span>}
      </button>
    );
  };
  return (
    <div className="flex flex-1 flex-col gap-2">
      {ms.map((m, i) => (
        <div key={i} className={`overflow-hidden rounded-xl border shadow-sm ${[m.home.id, m.away.id].includes(sel ?? -1) ? "border-accent" : "border-neutral-200 dark:border-neutral-800"}`}>
          <Row t={m.home} />
          <div className="h-px bg-neutral-100 dark:bg-neutral-800" />
          <Row t={m.away} />
        </div>
      ))}
    </div>
  );
}
function OptionPremium() {
  const [sel, setSel] = useState<number | null>(null);
  return (
    <div className="rounded-2xl border border-neutral-200 p-3 dark:border-neutral-800">
      <div className="flex items-start gap-2">
        <PremiumSide ms={LEFT} sel={sel} onPick={setSel} />
        <div className="flex w-12 shrink-0 flex-col items-center justify-center gap-1 self-stretch rounded-xl bg-gradient-to-b from-yellow-400/20 to-amber-500/10 py-3"><span className="text-3xl">🏆</span><span className="text-[9px] font-bold uppercase text-amber-600">Finale</span></div>
        <PremiumSide ms={RIGHT} sel={sel} onPick={setSel} right />
      </div>
      <Result sel={sel} />
    </div>
  );
}

// ───────────── Option 5 — Drapeaux XL ─────────────
function FlagSide({ ms, sel, onPick }: { ms: M[]; sel: number | null; onPick: (id: number) => void }) {
  const Flag = ({ t }: { t: T }) => {
    const isSel = t.id === sel;
    return (
      <button
        type="button"
        disabled={!!t.out}
        onClick={() => onPick(t.id)}
        title={t.name}
        className={`grid h-10 w-10 place-items-center rounded-full text-2xl transition ${
          isSel ? "ring-2 ring-accent ring-offset-2 dark:ring-offset-neutral-900" : t.out ? "opacity-30 grayscale" : "hover:scale-110"
        }`}
      >
        {t.flag}
      </button>
    );
  };
  return (
    <div className="flex flex-1 flex-col gap-2">
      {ms.map((m, i) => (
        <div key={i} className="flex items-center justify-center gap-1 rounded-lg bg-neutral-50 py-1 dark:bg-neutral-900">
          <Flag t={m.home} />
          <span className="text-[10px] text-neutral-400">vs</span>
          <Flag t={m.away} />
        </div>
      ))}
    </div>
  );
}
function OptionFlagsXL() {
  const [sel, setSel] = useState<number | null>(null);
  return (
    <div className="rounded-2xl border border-neutral-200 p-3 dark:border-neutral-800">
      <div className="flex items-start gap-3">
        <FlagSide ms={LEFT} sel={sel} onPick={setSel} />
        <div className="flex flex-col items-center justify-center self-center"><span className="text-3xl">🏆</span></div>
        <FlagSide ms={RIGHT} sel={sel} onPick={setSel} />
      </div>
      <Result sel={sel} />
    </div>
  );
}

export default function ChampionDemoPage() {
  const opts: [string, () => JSX.Element][] = [
    ["Option 1 — Tableau 2 côtés (base)", OptionTwoSided],
    ["Option 3 — Bracket élargi (16es + 8es)", OptionExpanded],
    ["Option 4 — Cartes premium", OptionPremium],
    ["Option 5 — Drapeaux XL", OptionFlagsXL],
  ];
  return (
    <div className="mx-auto max-w-2xl space-y-8 p-4">
      <h1 className="text-xl font-bold">Démo — sélection du champion</h1>
      {opts.map(([title, C]) => (
        <section key={title} className="space-y-2">
          <h2 className="font-bold text-accent">{title}</h2>
          <C />
        </section>
      ))}
    </div>
  );
}
