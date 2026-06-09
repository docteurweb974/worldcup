import { getStandings } from "@/lib/api";
import { StandingsView } from "@/components/StandingsView";

export default async function ClassementsPage() {
  const standings = await getStandings();
  return <StandingsView standings={standings} />;
}
