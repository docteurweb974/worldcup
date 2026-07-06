// @ts-nocheck
/**
 * Notif d'annonce ponctuelle — broadcast à TOUS les abonnés, une seule fois.
 *
 * Sert à annoncer une nouveauté (ici le jeu « Prédiction 🔮 »). Le verrou
 * notification_log (clé = ANNOUNCE_KEY) garantit un envoi unique, même si le
 * workflow est relancé. FORCE=1 renvoie quand même (test).
 *
 * Variables requises :
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:…)
 * Optionnelles : ANNOUNCE_KEY, ANNOUNCE_TITLE, ANNOUNCE_BODY, ANNOUNCE_URL.
 */
import webpush from "web-push";

const env = (k) => {
  const v = process.env[k];
  if (!v) {
    console.error(`✖ Variable d'environnement manquante : ${k}`);
    process.exit(1);
  }
  return v;
};

const SUPABASE_URL = env("SUPABASE_URL").replace(/\/$/, "");
const SUPABASE_KEY = env("SUPABASE_SERVICE_ROLE_KEY");
const VAPID_PUBLIC = env("VAPID_PUBLIC_KEY");
const VAPID_PRIVATE = env("VAPID_PRIVATE_KEY");
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:contact@worldcupfun.app";
const FORCE = process.env.FORCE === "1";

// Contenu de l'annonce (par défaut : le jeu Prédiction).
const ANNOUNCE_KEY = process.env.ANNOUNCE_KEY || "announce-prediction-v1";
const PAYLOAD = {
  title: process.env.ANNOUNCE_TITLE || "Nouveau jeu : Prédiction 🔮",
  body: process.env.ANNOUNCE_BODY || "Devine la finale : les 2 finalistes, le vainqueur et le score. Jusqu'à +40 pts !",
  url: process.env.ANNOUNCE_URL || "/champion",
  tag: "announce",
};

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

const sbHeaders = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};

async function getSubscriptions() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/push_subscriptions?select=endpoint,p256dh,auth,user_id`,
    { headers: sbHeaders },
  );
  if (!res.ok) throw new Error(`Supabase GET subs ${res.status} : ${await res.text()}`);
  return res.json();
}

async function deleteSubscription(endpoint) {
  await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`, {
    method: "DELETE",
    headers: sbHeaders,
  });
}

/** Insère une ligne de log si la clé n'existe pas encore. true = on doit envoyer. */
async function lockOnce(key) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/notification_log`, {
    method: "POST",
    headers: { ...sbHeaders, Prefer: "return=minimal" },
    body: JSON.stringify([{ key }]),
  });
  if (res.status === 201) return true;
  if (res.status === 409) return false;
  throw new Error(`Supabase log ${res.status} : ${await res.text()}`);
}

async function sendAll(subs, payload) {
  if (subs.length === 0) {
    console.log("Aucun destinataire.");
    return;
  }
  let ok = 0;
  let pruned = 0;
  await Promise.all(
    subs.map(async (row) => {
      const subscription = { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } };
      try {
        await webpush.sendNotification(subscription, JSON.stringify(payload));
        ok += 1;
      } catch (e) {
        if (e.statusCode === 404 || e.statusCode === 410) {
          await deleteSubscription(row.endpoint);
          pruned += 1;
        } else {
          console.error("envoi échoué:", e.statusCode || e.message);
        }
      }
    }),
  );
  console.log(`✓ Envoyé à ${ok} abonné(s), ${pruned} expiré(s) purgé(s).`);
}

async function main() {
  if (!FORCE) {
    const got = await lockOnce(ANNOUNCE_KEY);
    if (!got) {
      console.log(`Annonce « ${ANNOUNCE_KEY} » déjà envoyée.`);
      return;
    }
  } else {
    console.log("FORCE=1 → renvoi (sans verrou).");
  }
  console.log(`Annonce : ${PAYLOAD.title}`);
  await sendAll(await getSubscriptions(), PAYLOAD);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
