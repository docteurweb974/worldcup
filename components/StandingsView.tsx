import { StandingsTable } from "./StandingsTable";
import type { StandingGroup } from "@/lib/api";

export function StandingsView({ standings }: { standings: StandingGroup[] }) {
  const hasData = standings.some((g) => g.table.length > 0);

  if (!hasData) {
    return (
      <p className="mx-auto max-w-md p-10 text-center text-sm text-neutral-500">
        Les classements seront disponibles au coup d&apos;envoi de la compétition. ⚽
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-2xl animate-fade-in space-y-8 p-4">
      <h1 className="text-xl font-bold">Classements 📊</h1>
      {standings.map((group, i) => (
        <StandingsTable key={group.group ?? `${group.stage}-${i}`} group={group} />
      ))}
    </div>
  );
}
