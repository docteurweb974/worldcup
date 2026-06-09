"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { logout } from "@/app/auth/actions";

/** Indicateur d'état d'authentification dans l'en-tête. */
export function AuthButton() {
  const [username, setUsername] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active) return;
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .maybeSingle();
        setUsername(profile?.username ?? "Compte");
      } else {
        setUsername(null);
      }
      setReady(true);
    };

    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (!ready) {
    return <div className="h-tap w-20 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-800" />;
  }

  if (!username) {
    return (
      <Link
        href="/connexion"
        className="grid min-h-tap place-items-center rounded-full bg-accent px-4 text-sm font-semibold text-white"
      >
        Connexion
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="max-w-[6rem] truncate text-sm font-semibold" title={username}>
        {username}
      </span>
      <form action={logout}>
        <button
          type="submit"
          className="cursor-pointer text-xs text-neutral-500 underline-offset-2 hover:underline"
        >
          Déconnexion
        </button>
      </form>
    </div>
  );
}
