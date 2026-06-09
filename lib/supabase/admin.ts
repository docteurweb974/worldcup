import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Client Supabase avec la clé service_role : contourne la sécurité RLS.
 * À N'UTILISER QUE CÔTÉ SERVEUR (jamais exposé au navigateur).
 * Sert au calcul du classement (lecture des pronos de tous les joueurs).
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY manquante (Supabase → Project Settings → API → service_role).",
    );
  }
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
