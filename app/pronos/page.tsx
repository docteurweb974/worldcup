import Link from "next/link";
import { getResilientMatches } from "@/lib/results";
import { createClient } from "@/lib/supabase/server";
import { getUserBoosts } from "@/lib/boosts";
import { PronosBoard, type DbPrediction } from "@/components/PronosBoard";
import { ImportLocalPredictions } from "@/components/ImportLocalPredictions";
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

  const [{ data: preds }, matches, boosts] = await Promise.all([
    supabase.from("predictions").select("*").eq("user_id", user.id),
    getResilientMatches(),
    getUserBoosts(user.id),
  ]);

  const initialPredictions: DbPrediction[] = (preds ?? []).map((p) => ({
    matchId: p.match_id,
    home: p.home,
    away: p.away,
    qualifier: (p as { qualifier?: "home" | "away" | null }).qualifier ?? null,
  }));

  return (
    <div className="space-y-4 pb-4">
      <div className="mx-auto max-w-2xl space-y-4 px-4 pt-4">
        <Link
          href="/survivor"
          className="flex items-center justify-between gap-3 rounded-2xl border border-amber-400 bg-gradient-to-r from-amber-50 to-orange-50 p-4 transition hover:brightness-[1.02] dark:from-amber-500/10 dark:to-orange-500/10"
        >
          <div>
            <p className="font-bold">🔥 Mode Survivor</p>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              1 équipe par tour qui doit gagner. Dernier survivant → +10 pts !
            </p>
          </div>
          <span className="shrink-0 text-xl text-accent" aria-hidden="true">→</span>
        </Link>
        <ImportLocalPredictions />
      </div>
      <PronosBoard
        matches={matches}
        initialPredictions={initialPredictions}
        initialBoosts={boosts.byRound}
      />
      <LivePointsRefresher />
    </div>
  );
}
