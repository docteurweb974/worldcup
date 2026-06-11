import { getResilientMatches } from "@/lib/results";
import { createClient } from "@/lib/supabase/server";
import { CalendarView } from "@/components/CalendarView";

export default async function CalendrierPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [matches, predsRes] = await Promise.all([
    getResilientMatches(),
    user
      ? supabase.from("predictions").select("match_id").eq("user_id", user.id)
      : Promise.resolve({ data: [] as { match_id: number }[] }),
  ]);

  const predictedMatchIds = (predsRes.data ?? []).map((p) => p.match_id);

  return <CalendarView matches={matches} predictedMatchIds={predictedMatchIds} />;
}
