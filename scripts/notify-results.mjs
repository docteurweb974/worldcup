// @ts-nocheck
/**
 * Notif « Les résultats sont tombés 🎯 » — résumé de fin de journée.
 *
 * Lancé par GitHub Actions toutes les 15 min. Quand TOUS les matchs d'une
 * journée (fuseau de France) sont terminés, envoie une notification aux joueurs
 * ayant pronostiqué au moins un de ces matchs, pour les inviter à voir leurs
 * points / le classement. Une seule fois par journée (verrou notification_log),
 * et uniquement entre 8h et 23h (heure de France) pour ne déranger personne la
 * nuit. Purge les abonnements expirés. FORCE=1 = envoi de test à tous.
 *
 * Variables requises :
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FOOTBALL_DATA_API_KEY,
 *   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:…)
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

const parisHour = (d) =>
  Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Paris",
      hour: "2-digit",
      hour12: false,
      hourCycle: "h23",
    }).format(new Date(d)),
  );

const isFinished = (s) => s === "FINISHED" || s === "AWARDED";
const isCancelled = (s) => s === "CANCELLED" || s === "POSTPONED";

async function getSubscriptions() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/push_subscriptions?select=endpoint,p256dh,auth,user_id`,
    { headers: sbHeaders },
  );
  if (!res.ok) throw new Error(`Supabase GET subs ${res.status} : ${await res.text()}`);
  return res.json();
}

/** Set des user_id ayant pronostiqué au moins un des matchs donnés. */
async function getPredictorIds(matchIds) {
  if (matchIds.length === 0) return new Set();
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/predictions?match_id=in.(${matchIds.join(",")})&select=user_id`,
    { headers: sbHeaders },
  );
  if (!res.ok) throw new Error(`Supabase GET preds ${res.status} : ${await res.text()}`);
  const rows = await res.json();
  return new Set(rows.map((r) => r.user_id));
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
  title: "World Cup Fun",
  body: "Les résultats sont tombés 🎯",
  url: "/classements",
  tag: "results",
};

async function main() {
  if (FORCE) {
    console.log("FORCE=1 → envoi de test immédiat à tous les abonnés.");
    await sendAll(await getSubscriptions(), PAYLOAD);
    return;
  }

  const now = new Date();
  const hour = parisHour(now);
  const matches = await getMatches();

  // Journées candidates : hier et aujourd'hui (un match du soir peut finir après minuit).
  const todayKey = parisDay(now);
  const yesterdayKey = parisDay(new Date(now.getTime() - 24 * 3600 * 1000));

  for (const dayKey of [yesterdayKey, todayKey]) {
    const dayMatches = matches.filter(
      (m) => parisDay(m.utcDate) === dayKey && !isCancelled(m.status),
    );
    if (dayMatches.length === 0) continue;
    if (!dayMatches.every((m) => isFinished(m.status))) continue; // journée pas finie

    if (hour < 8 || hour >= 23) {
      console.log(`${dayKey} : résultats prêts mais hors plage 8h–23h (${hour}h). On attend.`);
      continue;
    }

    const got = await lockOnce(`results-${dayKey}`);
    if (!got) {
      console.log(`${dayKey} : déjà notifié.`);
      continue;
    }

    const matchIds = dayMatches.map((m) => m.id);
    const [subs, predictors] = await Promise.all([getSubscriptions(), getPredictorIds(matchIds)]);
    const targets = subs.filter((s) => predictors.has(s.user_id));
    console.log(`${dayKey} : ${dayMatches.length} matchs terminés → ${targets.length} destinataire(s).`);
    await sendAll(targets, PAYLOAD);
    return;
  }

  console.log("Aucune journée complète à notifier.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
