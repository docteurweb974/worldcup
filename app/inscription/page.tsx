import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignupForm } from "@/components/auth/SignupForm";

export default async function InscriptionPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/");
  return (
    <div className="animate-fade-in py-6">
      <SignupForm />
    </div>
  );
}
