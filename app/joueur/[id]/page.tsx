import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPlayerStats } from "@/lib/player-stats";
import { getFinishedPredictionsByRound } from "@/lib/player-predictions";
import { BADGES } from "@/lib/badges";
import { BadgeCelebration } from "@/components/BadgeCelebration";
import { ProfileView } from "@/components/ProfileView";
import { PagePlaceholder } from "@/components/PagePlaceholder";
import { TEAM_BY_TLA, flagImageUrl } from "@/data/teams";

export default async function PalmaresPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, favorite_team")
    .eq("id", params.id)
    .maybeSingle();

  if (!profile) {
    return <PagePlaceholder title="Joueur introuvable" step="vérifie le lien" />;
  }

  const [stats, predRounds] = await Promise.all([
    getPlayerStats(params.id),
    getFinishedPredictionsByRound(params.id),
  ]);
  const team = profile.favorite_team ? TEAM_BY_TLA[profile.favorite_team] : undefined;
  const isMe = user.id === params.id;
  const earnedBadges = BADGES.filter((b) => b.earned(stats)).map((b) => ({
    id: b.id,
    emoji: b.emoji,
    title: b.title,
    description: b.description,
  }));

  return (
    <>
      <ProfileView
        username={profile.username}
        teamFlag={team?.flag ?? ""}
        flagBg={team ? flagImageUrl(team) : null}
        rank={stats.rank}
        stats={stats}
        isMe={isMe}
        predRounds={predRounds}
        favoriteTla={profile.favorite_team ?? null}
      />
      {isMe && <BadgeCelebration userId={user.id} earned={earnedBadges} />}
    </>
  );
}
