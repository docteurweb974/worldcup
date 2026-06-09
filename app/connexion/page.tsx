import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "@/components/auth/LoginForm";

export default async function ConnexionPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/");
  return (
    <div className="animate-fade-in py-6">
      <LoginForm />
    </div>
  );
}
