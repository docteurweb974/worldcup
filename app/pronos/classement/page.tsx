import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLeaderboard } from "@/lib/leaderboard";
import { Leaderboard } from "@/components/Leaderboard";

export default async function ClassementPronosPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const leaderboard = await getLeaderboard();

  return (
    <div className="mx-auto max-w-2xl animate-fade-in space-y-4 p-4">
      <Link href="/pronos" className="text-sm text-neutral-500 hover:text-accent">
        ← Mes pronos
      </Link>
      <Leaderboard entries={leaderboard} currentUserId={user.id} />
    </div>
  );
}
