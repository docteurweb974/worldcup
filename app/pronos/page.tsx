import Link from "next/link";
import { getMatches } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import { getLeaderboard } from "@/lib/leaderboard";
import { PronosBoard, type DbPrediction } from "@/components/PronosBoard";
import { ImportLocalPredictions } from "@/components/ImportLocalPredictions";
import { Leaderboard } from "@/components/Leaderboard";
import { LivePointsRefresher } from "@/components/LivePointsRefresher";

export default async function PronosPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-md p-6">
        <div className="rounded-2xl border border-dashed border-neutral-300 p-6 text-center dark:border-neutral-700">
          <p className="font-medium">Connecte-toi pour pronostiquer 🎯</p>
          <p className="mt-1 text-sm text-neutral-500">
            Crée un compte pour enregistrer tes pronostics et affronter tes amis au classement.
          </p>
          <Link
            href="/connexion"
            className="mt-4 inline-grid min-h-tap place-items-center rounded-full bg-accent px-6 font-semibold text-white"
          >
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

  const [{ data: preds }, matches, leaderboard] = await Promise.all([
    supabase.from("predictions").select("match_id, home, away").eq("user_id", user.id),
    getMatches(),
    getLeaderboard(),
  ]);

  const initialPredictions: DbPrediction[] = (preds ?? []).map((p) => ({
    matchId: p.match_id,
    home: p.home,
    away: p.away,
  }));

  return (
    <div className="space-y-4 pb-4">
      <div className="mx-auto max-w-2xl space-y-4 px-4 pt-4">
        <ImportLocalPredictions />
        <Leaderboard
          entries={leaderboard}
          currentUserId={user.id}
          limit={10}
          moreHref="/pronos/classement"
        />
      </div>
      <PronosBoard matches={matches} initialPredictions={initialPredictions} />
      <LivePointsRefresher />
    </div>
  );
}
