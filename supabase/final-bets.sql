-- Paris bonus de la FINALE (1 grille par joueur) : 4 paris à +3 pts chacun.
-- À lancer dans Supabase → SQL Editor.
create table if not exists public.final_bets (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  half        text,  -- 'first' | 'equal' | 'second'  (mi-temps la plus prolifique)
  over_under  text,  -- 'over' | 'under'               (plus/moins de 2,5 buts)
  btts        text,  -- 'yes' | 'no'                   (les deux équipes marquent)
  ht_result   text,  -- 'home' | 'draw' | 'away'       (résultat à la mi-temps)
  created_at  timestamptz not null default now()
);

-- Accès uniquement via service_role (server actions + lecture serveur).
alter table public.final_bets enable row level security;
