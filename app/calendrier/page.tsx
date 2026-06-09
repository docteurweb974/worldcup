import { getMatches } from "@/lib/api";
import { CalendarView } from "@/components/CalendarView";

export default async function CalendrierPage() {
  const matches = await getMatches();
  return <CalendarView matches={matches} />;
}
