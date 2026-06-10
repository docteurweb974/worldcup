import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewPasswordForm } from "@/components/auth/NewPasswordForm";

export default async function NouveauMotDePassePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Accès uniquement avec une session de récupération (via le lien email).
  if (!user) redirect("/mot-de-passe-oublie");

  return (
    <div className="animate-fade-in py-6">
      <NewPasswordForm />
    </div>
  );
}
