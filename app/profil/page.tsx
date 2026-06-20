import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Les réglages (pseudo, équipe favorite) sont désormais dans la page profil,
// onglet « Paramètres ». On redirige vers le profil du joueur connecté.
export default async function ProfilPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");
  redirect(`/joueur/${user.id}`);
}
