import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSurvivorData } from "@/lib/survivor";
import { Survivor } from "@/components/Survivor";

export const dynamic = "force-dynamic";

export default async function SurvivorPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const data = await getSurvivorData(user.id);
  return <Survivor data={data} />;
}
