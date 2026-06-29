-- Tie-break « qualifié » des phases finales (8es+).
-- À lancer dans Supabase → SQL Editor.
--
-- Sur un pronostic NUL en phase finale (8es de finale et au-delà), le joueur peut
-- désigner l'équipe qu'il voit se qualifier. Si elle se qualifie réellement
-- (prolongation / tirs au but compris), il marque +2 pts bonus.
-- On stocke ce choix dans une colonne 'qualifier' : 'home' | 'away' | NULL.
alter table public.predictions
  add column if not exists qualifier text
  check (qualifier in ('home', 'away'));
