-- Scoring des phases finales sur le temps réglementaire (90').
-- À lancer dans Supabase → SQL Editor.
--
-- match_results stocke déjà home/away = fullTime (pour l'affichage).
-- On ajoute reg_home/reg_away = score à la fin du temps réglementaire (90'),
-- utilisé pour attribuer les points (hors prolongation et tirs au but) et rendu
-- résilient aux pertes de score de football-data.
-- (NULL pour les matchs de poules déjà capturés → on retombe sur fullTime, ce qui
--  est correct puisqu'il n'y a pas de prolongation en phase de groupes.)
alter table public.match_results
  add column if not exists reg_home integer,
  add column if not exists reg_away integer;
