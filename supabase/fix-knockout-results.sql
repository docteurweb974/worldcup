-- Correctif : purge des résultats à élimination figés en pleine prolongation/TAB.
-- À lancer UNE fois dans Supabase → SQL Editor.
--
-- Certains matchs (ex. Pays-Bas–Maroc) ont été capturés alors que la séance de
-- tirs au but n'était pas finie → fullTime incohérent (ex. 4-3 au lieu de 3-4).
-- On supprime toutes les lignes des matchs allés au-delà de 90' (reg_home non NULL) :
-- elles seront recapturées correctement (le code ne fige désormais le score que
-- s'il est cohérent : fullTime = temps réglementaire + prolongation + TAB).
delete from public.match_results
where reg_home is not null;
