"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface WebPushSub {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/** Table push_subscriptions (hors types générés). */
function subsTable(admin: ReturnType<typeof createAdminClient>) {
  return (
    admin as unknown as {
      from: (t: string) => {
        upsert: (
          v: Record<string, unknown>,
          o: { onConflict: string },
        ) => Promise<{ error: { message: string } | null }>;
        delete: () => {
          eq: (c: string, v: string) => { eq: (c: string, v: string) => Promise<unknown> };
        };
      };
    }
  ).from("push_subscriptions");
}

/** Enregistre l'abonnement push du joueur connecté. */
export async function savePushSubscription(sub: WebPushSub) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "non-connecté" };

  const { error } = await subsTable(createAdminClient()).upsert(
    {
      user_id: user.id,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    },
    { onConflict: "endpoint" },
  );
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Supprime l'abonnement (désactivation des notifications). */
export async function deletePushSubscription(endpoint: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "non-connecté" };

  await subsTable(createAdminClient()).delete().eq("endpoint", endpoint).eq("user_id", user.id);
  return { ok: true };
}
