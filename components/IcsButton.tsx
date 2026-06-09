"use client";

import { usePreferences } from "./PreferencesProvider";
import { buildCalendar } from "@/lib/ics";
import type { Match } from "@/lib/api";

/**
 * Bouton de téléchargement d'un fichier .ics généré côté client.
 * Les heures respectent le fuseau choisi (via buildCalendar).
 */
export function IcsButton({
  matches,
  filename,
  label,
}: {
  matches: Match[];
  filename: string;
  label: string;
}) {
  const { timezone } = usePreferences();
  const disabled = matches.length === 0;

  const handleDownload = () => {
    const ics = buildCalendar(matches, timezone);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={disabled}
      className="inline-flex min-h-tap cursor-pointer items-center gap-2 rounded-full bg-cta px-5 text-sm font-semibold text-cta-fg shadow-sm transition-[filter,transform] duration-200 hover:brightness-110 active:scale-95 disabled:opacity-50"
    >
      <span aria-hidden="true">📅</span> {label}
    </button>
  );
}
