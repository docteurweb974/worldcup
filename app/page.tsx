import { getMatches } from "@/lib/api";
import { getLeaderboard } from "@/lib/leaderboard";
import { createClient } from "@/lib/supabase/server";
import { HomeContent } from "@/components/HomeContent";
import type { SlimMatch } from "@/components/Countdown";

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [matches, leaderboard, profileRes] = await Promise.all([
    getMatches(),
    getLeaderboard(),
    user
      ? supabase.from("profiles").select("favorite_team").eq("id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
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
      currentUserId={user?.id ?? null}
      favoriteTeamTla={profileRes.data?.favorite_team ?? null}
    />
  );
}
