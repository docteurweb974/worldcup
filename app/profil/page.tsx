import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UsernameForm } from "@/components/profile/UsernameForm";
import { FavoriteTeamPicker } from "@/components/profile/FavoriteTeamPicker";

export default async function ProfilPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, favorite_team")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-lg animate-fade-in space-y-6 p-4">
      <h1 className="text-2xl font-bold">Mon profil</h1>

      <section className="space-y-3 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="font-bold">Pseudo</h2>
        <UsernameForm current={profile?.username ?? ""} />
      </section>

      <section className="space-y-3 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="font-bold">Mon équipe favorite</h2>
        <p className="text-sm text-neutral-500">
          Elle habille la page d&apos;accueil de son drapeau et de ses couleurs.
        </p>
        <FavoriteTeamPicker current={profile?.favorite_team ?? null} />
      </section>
    </div>
  );
}
