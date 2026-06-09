import { getMatches } from "@/lib/api";
import { getLeaderboard } from "@/lib/leaderboard";
import { createClient } from "@/lib/supabase/server";
import { HomeContent } from "@/components/HomeContent";
import type { SlimMatch } from "@/components/Countdown";

export default async function HomePage() {
  const supabase = createClient();
  const [matches, leaderboard, userRes] = await Promise.all([
    getMatches(),
    getLeaderboard(),
    supabase.auth.getUser(),
  ]);

  const slim: SlimMatch[] = matches.map((m) => ({
    id: m.id,
    utcDate: m.utcDate,
    homeTla: m.homeTeam.tla,
    awayTla: m.awayTeam.tla,
  }));

  return (
    <HomeContent
      matches={slim}
      leaderboard={leaderboard}
      currentUserId={userRes.data.user?.id ?? null}
    />
  );
}
