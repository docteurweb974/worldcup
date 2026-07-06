import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getChampionData } from "@/lib/champion";
import { Champion } from "@/components/Champion";

export const dynamic = "force-dynamic";

export default async function ChampionPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const data = await getChampionData(user.id);
  return <Champion data={data} />;
}
