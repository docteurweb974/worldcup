import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPlayerStats } from "@/lib/player-stats";
import { earnedCount, BADGES } from "@/lib/badges";
import { BadgeGrid } from "@/components/BadgeGrid";
import { BadgeCelebration } from "@/components/BadgeCelebration";
import { CountUp } from "@/components/CountUp";
import { PagePlaceholder } from "@/components/PagePlaceholder";
import { TEAM_BY_TLA } from "@/data/teams";

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

  const stats = await getPlayerStats(params.id);
  const team = profile.favorite_team ? TEAM_BY_TLA[profile.favorite_team] : undefined;
  const isMe = user.id === params.id;
  const earnedBadges = BADGES.filter((b) => b.earned(stats)).map((b) => ({
    id: b.id,
    emoji: b.emoji,
    title: b.title,
    description: b.description,
  }));

  return (
    <div className="mx-auto max-w-2xl animate-fade-in space-y-6 p-4">
      <Link href="/pronos/classement" className="text-sm text-neutral-500 hover:text-accent">
        ← Classement
      </Link>

      <header className="text-center">
        <div className="text-5xl" aria-hidden="true">
          {team?.flag ?? "🏆"}
        </div>
        <h1 className="mt-1 text-2xl font-bold">
          {profile.username}
          {isMe && <span className="text-neutral-400"> (toi)</span>}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          <CountUp value={stats.points} /> pts
          {stats.rank > 0 && <> · {stats.rank}ᵉ au classement</>}
          {" · "}
          {earnedCount(stats)}/{BADGES.length} badges
        </p>
      </header>

      <BadgeGrid stats={stats} />
      {isMe && <BadgeCelebration userId={user.id} earned={earnedBadges} />}
    </div>
  );
}
