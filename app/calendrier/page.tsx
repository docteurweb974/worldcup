import { getMatches } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import { CalendarView } from "@/components/CalendarView";

export default async function CalendrierPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [matches, predsRes] = await Promise.all([
    getMatches(),
    user
      ? supabase.from("predictions").select("match_id, home, away").eq("user_id", user.id)
      : Promise.resolve({ data: [] as { match_id: number; home: number; away: number }[] }),
  ]);

  const initialPredictions = (predsRes.data ?? []).map((p) => ({
    matchId: p.match_id,
    home: p.home,
    away: p.away,
  }));

  return (
    <CalendarView matches={matches} isLoggedIn={!!user} initialPredictions={initialPredictions} />
  );
}
