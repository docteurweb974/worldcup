import { getMatches } from "@/lib/api";
import { HomeContent } from "@/components/HomeContent";
import type { SlimMatch } from "@/components/Countdown";

export default async function HomePage() {
  const matches = await getMatches();
  const slim: SlimMatch[] = matches.map((m) => ({
    id: m.id,
    utcDate: m.utcDate,
    homeTla: m.homeTeam.tla,
    awayTla: m.awayTeam.tla,
  }));
  return <HomeContent matches={slim} />;
}
