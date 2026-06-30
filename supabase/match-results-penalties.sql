-- Affichage du vrai score (hors tirs au but) — résilient.
-- À lancer dans Supabase → SQL Editor.
--
-- football-data ajoute les buts de la séance de TAB dans fullTime (ex. un 1-1
-- gagné 4-3 aux TAB est renvoyé "fullTime": 4-3). On mémorise le score des TAB
-- (pen_home/pen_away) pour pouvoir réafficher le vrai score (fullTime − TAB) même
-- si la source perd l'info. NULL = pas de séance de tirs au but.
alter table public.match_results
  add column if not exists pen_home integer,
  add column if not exists pen_away integer;
