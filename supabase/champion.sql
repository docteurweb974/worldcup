-- Mode « Prédis le Champion » : 1 choix par joueur (équipe + score exact de la finale).
-- À lancer dans Supabase → SQL Editor.
create table if not exists public.champion_picks (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  team_id     integer not null,      -- id football-data de l'équipe championne prédite
  champ_goals integer not null,      -- buts du champion en finale
  opp_goals   integer not null,      -- buts de l'adversaire en finale
  created_at  timestamptz not null default now()
);

-- Accès uniquement via service_role (server actions + lecture serveur).
alter table public.champion_picks enable row level security;
