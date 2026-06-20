import { getStandings, getScorers, type StandingGroup, type Scorer } from "@/lib/api";
import { getLeaderboard } from "@/lib/leaderboard";
import { createClient } from "@/lib/supabase/server";
import { ClassementTabs } from "@/components/ClassementTabs";

export default async function ClassementsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let standings: StandingGroup[] = [];
  let scorers: Scorer[] = [];
  const [leaderboard] = await Promise.all([
    getLeaderboard(),
    getStandings()
      .then((s) => {
        standings = s;
      })
      .catch(() => undefined),
    getScorers()
      .then((s) => {
        scorers = s;
      })
      .catch(() => undefined),
  ]);

  return (
    <ClassementTabs
      leaderboard={leaderboard}
      currentUserId={user?.id ?? null}
      standings={standings}
      scorers={scorers}
    />
  );
}
