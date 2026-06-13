"use client";

import { usePreferences } from "./PreferencesProvider";
import { TEAM_BY_ID, displayTeam } from "@/data/teams";
import { formatGroup, type StandingGroup, type StandingRow } from "@/lib/api";

// Colonnes statistiques (clé technique → en-tête affiché).
// Pts en premier : la colonne la plus importante reste visible sans scroller.
const COLS: [keyof StandingRow, string][] = [
  ["points", "Pts"],
  ["playedGames", "J"],
  ["won", "V"],
  ["draw", "N"],
  ["lost", "D"],
  ["goalsFor", "BP"],
  ["goalsAgainst", "BC"],
  ["goalDifference", "Diff"],
];

export function StandingsTable({ group }: { group: StandingGroup }) {
  const { favorites } = usePreferences();
  const fav = new Set(favorites);
  const title = group.group ? formatGroup(group.group) : group.stage;

  return (
    <section>
      <h2 className="mb-2 font-bold">{title}</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] text-sm">
          <thead>
            <tr className="text-left text-xs text-neutral-500">
              <th className="px-2 py-1">#</th>
              <th className="px-2 py-1">Équipe</th>
              {COLS.map(([, label]) => (
                <th
                  key={label}
                  className={`px-2 py-1 text-center font-medium ${label === "Pts" ? "text-accent" : ""}`}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {group.table.map((row) => {
              const known = row.team.id != null ? TEAM_BY_ID[row.team.id] : undefined;
              const isFav = known != null && fav.has(known.tla);
              const { flag, nameFr } = displayTeam(row.team.id, row.team.name);
              return (
                <tr
                  key={row.team.id ?? row.position}
                  className={`border-t border-neutral-100 dark:border-neutral-900 ${
                    isFav ? "bg-accent-soft font-semibold" : ""
                  }`}
                >
                  <td className="px-2 py-2 tabular-nums">{row.position}</td>
                  <td className="px-2 py-2">
                    <span className="mr-1" aria-hidden="true">{flag}</span>
                    {nameFr}
                  </td>
                  {COLS.map(([key, label]) => (
                    <td
                      key={label}
                      className={`px-2 py-2 text-center tabular-nums ${
                        label === "Pts" ? "font-bold text-accent" : ""
                      }`}
                    >
                      {row[key] as number}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
