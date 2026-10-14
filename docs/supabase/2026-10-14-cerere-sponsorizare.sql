-- „Vreau asta” din configuratorul de pe /parteneri#construieste trimite un lead nou cu tip = 'cerere-sponsorizare'
-- (formatul, tema și echipa alese ajung în mesaj). Aplicată pe proiectul antreprenoria.
alter table public.implicari drop constraint implicari_tip_check;
alter table public.implicari add constraint implicari_tip_check
  check (tip = any (array['sponsorizare', 'gazduire', 'mentorat', 'cerere-sponsorizare']));
