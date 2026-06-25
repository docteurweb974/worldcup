// @ts-nocheck
/**
 * Rappel pronos — « Plus que 1h pour pronostiquer les matchs du jour ! »
 *
 * Lancé par GitHub Actions toutes les 15 min. ~1h avant le coup d'envoi du
 * PREMIER match encore pronostiquable de la journée (fuseau de France), envoie
 * une notification push UNIQUEMENT aux joueurs ayant au moins un match du jour
 * non pronostiqué. Anti-doublon via notification_log (1 envoi/jour). Purge les
 * abonnements expirés (404/410). FORCE=1 = envoi de test à tous les abonnés.
 *
 * Variables requises :
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FOOTBALL_DATA_API_KEY,
 *   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:…)
 * Optionnelle : FORCE=1 (envoi immédiat de test, sans condition d'horaire ni log).
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
const FOOTBALL_KEY = env("FOOTBALL_DATA_API_KEY");
const VAPID_PUBLIC = env("VAPID_PUBLIC_KEY");
const VAPID_PRIVATE = env("VAPID_PRIVATE_KEY");
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:contact@worldcupfun.app";
const FORCE = process.env.FORCE === "1";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

const sbHeaders = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};

// ───────────────────────── data ─────────────────────────
async function getMatches() {
  const res = await fetch("https://api.football-data.org/v4/competitions/WC/matches", {
    headers: { "X-Auth-Token": FOOTBALL_KEY },
  });
  if (!res.ok) throw new Error(`football-data ${res.status}`);
  return (await res.json()).matches ?? [];
}

const parisDay = (d) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(d));

const canPredict = (s) => s === "SCHEDULED" || s === "TIMED";

async function getSubscriptions() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/push_subscriptions?select=endpoint,p256dh,auth,user_id`,
    { headers: sbHeaders },
  );
  if (!res.ok) throw new Error(`Supabase GET subs ${res.status} : ${await res.text()}`);
  return res.json();
}

/** Map user_id → Set(match_id pronostiqués) parmi les matchs donnés. */
async function getPredictedMap(matchIds) {
  if (matchIds.length === 0) return new Map();
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/predictions?match_id=in.(${matchIds.join(",")})&select=user_id,match_id`,
    { headers: sbHeaders },
  );
  if (!res.ok) throw new Error(`Supabase GET preds ${res.status} : ${await res.text()}`);
  const rows = await res.json();
  const map = new Map();
  for (const r of rows) {
    if (!map.has(r.user_id)) map.set(r.user_id, new Set());
    map.get(r.user_id).add(r.match_id);
  }
  return map;
}

async function deleteSubscription(endpoint) {
  await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`, {
    method: "DELETE",
    headers: sbHeaders,
  });
}

/** Insère une ligne de log si la clé n'existe pas encore. Retourne true si on doit envoyer. */
async function lockOnce(key) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/notification_log`, {
    method: "POST",
    headers: { ...sbHeaders, Prefer: "return=minimal" },
    body: JSON.stringify([{ key }]),
  });
  if (res.status === 201) return true; // verrou acquis
  if (res.status === 409) return false; // déjà envoyé aujourd'hui
  throw new Error(`Supabase log ${res.status} : ${await res.text()}`);
}

// ───────────────────────── envoi ─────────────────────────
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

const PAYLOAD = {
  title: "World Cup Fun 🔔",
  body: "Plus que 1h pour pronostiquer les matchs du jour !",
  url: "/pronos",
  tag: "prono-reminder",
};

async function main() {
  if (FORCE) {
    console.log("FORCE=1 → envoi de test immédiat à tous les abonnés.");
    await sendAll(await getSubscriptions(), PAYLOAD);
    return;
  }

  const now = new Date();
  const today = parisDay(now);
  const matches = await getMatches();
  const todayMatches = matches
    .filter((m) => canPredict(m.status) && parisDay(m.utcDate) === today)
    .sort((a, b) => +new Date(a.utcDate) - +new Date(b.utcDate));

  if (todayMatches.length === 0) {
    console.log("Pas de match pronostiquable aujourd'hui.");
    return;
  }

  const firstKickoff = new Date(todayMatches[0].utcDate);
  const minutes = (firstKickoff - now) / 60000;
  console.log(`1er match du jour dans ${Math.round(minutes)} min.`);

  // Fenêtre large (cron jitter) ; le verrou garantit un seul envoi.
  if (minutes < 45 || minutes > 75) {
    console.log("Hors fenêtre de rappel (45–75 min avant). Rien à faire.");
    return;
  }

  // Ne rappeler que les joueurs ayant au moins un match du jour NON pronostiqué.
  const matchIds = todayMatches.map((m) => m.id);
  const [subs, predicted] = await Promise.all([getSubscriptions(), getPredictedMap(matchIds)]);
  const targets = subs.filter(
    (s) => (predicted.get(s.user_id)?.size ?? 0) < matchIds.length,
  );

  if (targets.length === 0) {
    console.log("Tout le monde a déjà pronostiqué les matchs du jour. Rien à envoyer.");
    return;
  }

  const send = await lockOnce(`prono-reminder-${today}`);
  if (!send) {
    console.log("Rappel déjà envoyé aujourd'hui.");
    return;
  }
  console.log(`${targets.length} joueur(s) à rappeler.`);
  await sendAll(targets, PAYLOAD);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
