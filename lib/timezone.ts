/**
 * Formatage des heures multi-fuseaux.
 *
 * Deux fuseaux possibles selon le toggle utilisateur :
 *   - « France 🇫🇷 » → Europe/Paris (heure d'été/hiver gérée par Intl)
 *   - « Péi 🌴 »     → Indian/Reunion (UTC+4 fixe, pas d'heure d'été)
 *
 * On ne hardcode JAMAIS l'offset : tout passe par Intl.DateTimeFormat.
 */
export type TimezoneChoice = "france" | "pei";

export const TIMEZONES: Record<TimezoneChoice, string> = {
  france: "Europe/Paris",
  pei: "Indian/Reunion",
};

export const TIMEZONE_LABELS: Record<TimezoneChoice, string> = {
  france: "France 🇫🇷",
  pei: "Péi 🌴",
};

/** Composantes d'une date « éclatées » dans un fuseau donné. */
export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/**
 * Décompose une date (UTC) en composantes locales du fuseau choisi.
 * Sert au formatage et à la génération .ics (heure murale exacte).
 */
export function getZonedParts(date: Date, tz: TimezoneChoice): ZonedParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONES[tz],
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Heure courte, ex. « 22:00 ». */
export function formatTime(iso: string, tz: TimezoneChoice): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: TIMEZONES[tz],
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}

/** Date longue, ex. « Mardi 18 juin ». */
export function formatDateLong(iso: string, tz: TimezoneChoice): string {
  const s = new Intl.DateTimeFormat("fr-FR", {
    timeZone: TIMEZONES[tz],
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(iso));
  return capitalize(s);
}

/** Libellé complet, ex. « Mardi 18 juin — 22:00 ». */
export function formatFull(iso: string, tz: TimezoneChoice): string {
  return `${formatDateLong(iso, tz)} — ${formatTime(iso, tz)}`;
}

/** Clé de regroupement par jour (« 2026-06-18 ») dans le fuseau choisi. */
export function dayKey(iso: string, tz: TimezoneChoice): string {
  const p = getZonedParts(new Date(iso), tz);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** Heure (0-23) dans le fuseau choisi — utile pour les salutations créoles. */
export function getHourInTimezone(date: Date, tz: TimezoneChoice): number {
  return getZonedParts(date, tz).hour;
}
