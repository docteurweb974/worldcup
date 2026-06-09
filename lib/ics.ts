/**
 * Génération de fichiers iCalendar (.ics) sans dépendance externe.
 *
 * L'heure des événements respecte le fuseau choisi par l'utilisateur : on émet
 * une heure murale locale liée à un bloc VTIMEZONE (TZID), si bien que le match
 * apparaît à la bonne heure quel que soit le fuseau de l'appareil.
 */
import type { Match } from "./api";
import { getZonedParts, TIMEZONES, type TimezoneChoice } from "./timezone";
import { TEAM_BY_ID } from "@/data/teams";

const DURATION_MIN = 120; // durée estimée d'un match (avec mi-temps)

const pad = (n: number) => String(n).padStart(2, "0");

/** Échappe les caractères spéciaux iCalendar dans un texte. */
function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

/** Heure murale locale du fuseau, ex. « 20260618T220000 ». */
function localStamp(date: Date, tz: TimezoneChoice): string {
  const p = getZonedParts(date, tz);
  return `${p.year}${pad(p.month)}${pad(p.day)}T${pad(p.hour)}${pad(p.minute)}${pad(p.second)}`;
}

/** Horodatage UTC, ex. « 20260618T200000Z » (pour DTSTAMP). */
function utcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Blocs VTIMEZONE minimaux mais corrects pour les deux fuseaux supportés. */
const VTIMEZONES: Record<TimezoneChoice, string[]> = {
  pei: [
    "BEGIN:VTIMEZONE",
    "TZID:Indian/Reunion",
    "BEGIN:STANDARD",
    "DTSTART:19700101T000000",
    "TZOFFSETFROM:+0400",
    "TZOFFSETTO:+0400",
    "TZNAME:+04",
    "END:STANDARD",
    "END:VTIMEZONE",
  ],
  france: [
    "BEGIN:VTIMEZONE",
    "TZID:Europe/Paris",
    "BEGIN:DAYLIGHT",
    "TZOFFSETFROM:+0100",
    "TZOFFSETTO:+0200",
    "TZNAME:CEST",
    "DTSTART:19700329T020000",
    "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
    "END:DAYLIGHT",
    "BEGIN:STANDARD",
    "TZOFFSETFROM:+0200",
    "TZOFFSETTO:+0100",
    "TZNAME:CET",
    "DTSTART:19701025T030000",
    "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
    "END:STANDARD",
    "END:VTIMEZONE",
  ],
};

/** Libellé « 🇫🇷 France » à partir d'une équipe de match (avec repli API). */
function teamLabel(team: Match["homeTeam"]): string {
  const known = team.id != null ? TEAM_BY_ID[team.id] : undefined;
  if (known) return `${known.flag} ${known.nameFr}`;
  return team.name ?? "À déterminer";
}

/** Bloc VEVENT pour un match. */
function buildEvent(match: Match, tz: TimezoneChoice): string[] {
  const start = new Date(match.utcDate);
  const end = new Date(start.getTime() + DURATION_MIN * 60_000);
  const tzid = TIMEZONES[tz];
  const summary = `${teamLabel(match.homeTeam)} – ${teamLabel(match.awayTeam)}`;
  const description = [match.stage, match.group].filter(Boolean).join(" · ");
  return [
    "BEGIN:VEVENT",
    `UID:wc2026-match-${match.id}@worldcupfun`,
    `DTSTAMP:${utcStamp(new Date())}`,
    `DTSTART;TZID=${tzid}:${localStamp(start, tz)}`,
    `DTEND;TZID=${tzid}:${localStamp(end, tz)}`,
    `SUMMARY:⚽ ${escapeText(summary)}`,
    description ? `DESCRIPTION:${escapeText(description)}` : "",
    "END:VEVENT",
  ].filter(Boolean);
}

/** Plie les lignes > 75 octets selon la RFC 5545 (continuation par espace). */
function foldLine(line: string): string {
  if (line.length <= 73) return line;
  const chunks: string[] = [];
  let rest = line;
  chunks.push(rest.slice(0, 73));
  rest = rest.slice(73);
  while (rest.length > 72) {
    chunks.push(" " + rest.slice(0, 72));
    rest = rest.slice(72);
  }
  if (rest.length) chunks.push(" " + rest);
  return chunks.join("\r\n");
}

/** Génère le contenu .ics complet pour une liste de matchs. */
export function buildCalendar(matches: Match[], tz: TimezoneChoice): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//World Cup Fun//Coupe du Monde 2026//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...VTIMEZONES[tz],
    ...matches.flatMap((m) => buildEvent(m, tz)),
    "END:VCALENDAR",
  ];
  return lines.map(foldLine).join("\r\n");
}

/** Nom de fichier .ics suggéré. */
export function calendarFilename(single?: Match): string {
  if (single) return `wc2026-match-${single.id}.ics`;
  return "wc2026-mes-matchs.ics";
}
