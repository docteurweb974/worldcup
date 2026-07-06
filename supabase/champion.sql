-- Mode « Prédis le Champion » : 1 finale prédite par joueur
-- (champion + finaliste + score exact de la finale).
-- À lancer dans Supabase → SQL Editor.
create table if not exists public.champion_picks (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  team_id     integer not null,      -- id football-data de l'équipe championne prédite
  finalist_id integer,               -- id du finaliste (vice-champion) prédit
  champ_goals integer not null,      -- buts du champion en finale
  opp_goals   integer not null,      -- buts du finaliste en finale
  created_at  timestamptz not null default now()
);

-- Migration si la table existe déjà (ajout du finaliste) :
alter table public.champion_picks add column if not exists finalist_id integer;

-- Accès uniquement via service_role (server actions + lecture serveur).
alter table public.champion_picks enable row level security;
