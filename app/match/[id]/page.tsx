import { getResilientMatch } from "@/lib/results";
import { isFinished } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import { getMatchCommunity } from "@/lib/community";
import { getFinalBetsData } from "@/lib/final-bets";
import { getStoredVideo } from "@/lib/videos";
import { MatchDetail } from "@/components/MatchDetail";
import { FinalBets } from "@/components/FinalBets";
import { MatchHighlights } from "@/components/MatchHighlights";
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
      .select("*")
      .eq("user_id", user.id)
      .eq("match_id", id)
      .maybeSingle();
    if (data) {
      prediction = {
        home: data.home,
        away: data.away,
        qualifier: (data as { qualifier?: "home" | "away" | null }).qualifier ?? null,
      };
    }
  }

  // Pronos de la communauté + résumé vidéo : uniquement pour un match terminé.
  const finished = isFinished(match.status);
  const community = finished ? await getMatchCommunity(match) : null;
  const video = finished ? await getStoredVideo(id) : null;
  // Paris bonus : uniquement sur la finale.
  const finalBets = match.stage === "FINAL" ? await getFinalBetsData(user?.id ?? null) : null;

  return (
    <>
      <MatchDetail
        match={match}
        prediction={prediction}
        isLoggedIn={!!user}
        community={community}
      />
      {finalBets && (
        <div className="mx-auto max-w-xl px-4 pb-4">
          <FinalBets data={finalBets} isLoggedIn={!!user} />
        </div>
      )}
      {video && <MatchHighlights youtubeId={video.youtube_id} title={video.title} />}
    </>
  );
}
