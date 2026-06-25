-- Notifications push (Web Push self-hosted)
-- À lancer dans Supabase → SQL Editor.

-- Abonnements push : une ligne par appareil/navigateur abonné.
create table if not exists public.push_subscriptions (
  endpoint   text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions(user_id);

-- Accès uniquement via la clé service_role (server actions + script GitHub Actions).
-- RLS activé sans policy publique = aucune lecture/écriture côté client.
alter table public.push_subscriptions enable row level security;

-- Anti-doublon des envois : 1 clé (ex. « prono-reminder-2026-06-25 ») = 1 notification.
create table if not exists public.notification_log (
  key     text primary key,
  sent_at timestamptz not null default now()
);
alter table public.notification_log enable row level security;
