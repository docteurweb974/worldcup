import Link from "next/link";
import { getMatches } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import { PronosBoard, type DbPrediction } from "@/components/PronosBoard";
import { ImportLocalPredictions } from "@/components/ImportLocalPredictions";

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

  const [{ data: preds }, matches] = await Promise.all([
    supabase.from("predictions").select("match_id, home, away").eq("user_id", user.id),
    getMatches(),
  ]);

  const initialPredictions: DbPrediction[] = (preds ?? []).map((p) => ({
    matchId: p.match_id,
    home: p.home,
    away: p.away,
  }));

  return (
    <div className="pb-4">
      <div className="mx-auto max-w-2xl space-y-3 px-4 pt-4">
        <ImportLocalPredictions />
        <Link
          href="/pronos/classement"
          className="flex min-h-tap items-center justify-center gap-2 rounded-2xl bg-accent px-4 font-semibold text-white transition-colors hover:brightness-110"
        >
          🏆 Voir le classement
        </Link>
      </div>
      <PronosBoard matches={matches} initialPredictions={initialPredictions} />
    </div>
  );
}
