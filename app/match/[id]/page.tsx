import { getResilientMatch } from "@/lib/results";
import { createClient } from "@/lib/supabase/server";
import { getMatchCommunity } from "@/lib/community";
import { MatchDetail } from "@/components/MatchDetail";
import { PagePlaceholder } from "@/components/PagePlaceholder";
import type { ScorePrediction } from "@/lib/predictions";

export default async function MatchPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const match = await getResilientMatch(id);
  if (!match) {
    return <PagePlaceholder title="Match introuvable" step="vérifie le lien" />;
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let prediction: ScorePrediction | null = null;
  if (user) {
    const { data } = await supabase
      .from("predictions")
      .select("home, away")
      .eq("user_id", user.id)
      .eq("match_id", id)
      .maybeSingle();
    if (data) prediction = { home: data.home, away: data.away };
  }

  // Répartition de la communauté, seulement après le coup d'envoi.
  const started = new Date(match.utcDate).getTime() <= Date.now();
  const community = started ? await getMatchCommunity(id) : null;

  return (
    <MatchDetail
      match={match}
      prediction={prediction}
      isLoggedIn={!!user}
      community={community}
    />
  );
}
