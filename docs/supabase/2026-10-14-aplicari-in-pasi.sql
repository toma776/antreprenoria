-- Aplicarea în pași (/aplica): se salvează din primul pas (contact), ca echipa să poată trimite remindere
-- celor care nu termină. Se rulează o dată în Supabase (SQL Editor), proiectul gqhjaagqwizauzxhnbwi.
alter table public.aplicari alter column editie drop not null, alter column cui drop not null, alter column cifra_afaceri drop not null;
alter table public.aplicari
  add column if not exists token uuid not null default gen_random_uuid() unique,
  add column if not exists pas int not null default 1,
  add column if not exists finalizata boolean not null default false,
  add column if not exists actualizat timestamptz not null default now(),
  add column if not exists raspunsuri jsonb not null default '{}'::jsonb;

-- creează sau completează o aplicare după token; una trimisă nu se mai poate modifica
create or replace function public.aplicare_salveaza(p jsonb) returns uuid
language plpgsql security definer set search_path to '' as $$
declare t uuid := nullif(p->>'token', '')::uuid;
begin
  if t is not null and exists (select 1 from public.aplicari a where a.token = t and not a.finalizata) then
    update public.aplicari set nume = p->>'nume', email = p->>'email', telefon = p->>'telefon', companie = p->>'companie',
      cui = p->>'cui', cifra_afaceri = p->>'cifra_afaceri', editie = p->>'editie', sursa = p->>'sursa', sursa_alta = p->>'sursa_alta',
      raspunsuri = coalesce(p->'raspunsuri', '{}'::jsonb), pas = greatest(pas, coalesce((p->>'pas')::int, 1)),
      finalizata = coalesce((p->>'finalizata')::boolean, false),
      stare = case when coalesce((p->>'finalizata')::boolean, false) then 'nouă' else stare end,
      actualizat = now()
    where token = t;
    return t;
  end if;
  insert into public.aplicari (nume, email, telefon, companie, cui, cifra_afaceri, editie, sursa, sursa_alta, acord, sursa_pagina, raspunsuri, pas, finalizata, stare)
  values (p->>'nume', p->>'email', p->>'telefon', p->>'companie', p->>'cui', p->>'cifra_afaceri', p->>'editie', p->>'sursa', p->>'sursa_alta', true, p->>'sursa_pagina',
    coalesce(p->'raspunsuri', '{}'::jsonb), coalesce((p->>'pas')::int, 1), coalesce((p->>'finalizata')::boolean, false),
    case when coalesce((p->>'finalizata')::boolean, false) then 'nouă' else 'incompletă' end)
  returning token into t;
  return t;
end $$;

-- reluarea unei aplicări neterminate (din linkul de reminder): doar cu tokenul, doar cât nu e trimisă
create or replace function public.aplicare_reia(t uuid) returns jsonb
language sql security definer set search_path to '' as $$
  select jsonb_build_object('nume', a.nume, 'email', a.email, 'telefon', a.telefon, 'companie', a.companie, 'cui', a.cui,
    'cifra_afaceri', a.cifra_afaceri, 'editie', a.editie, 'sursa', a.sursa, 'sursa_alta', a.sursa_alta, 'pas', a.pas) || a.raspunsuri
  from public.aplicari a where a.token = t and not a.finalizata;
$$;

revoke all on function public.aplicare_salveaza(jsonb) from public;
revoke all on function public.aplicare_reia(uuid) from public;
grant execute on function public.aplicare_salveaza(jsonb) to anon, authenticated;
grant execute on function public.aplicare_reia(uuid) to anon, authenticated;

-- constrângerile vechi: starea „incompletă” și noile intervale ale cifrei de afaceri
alter table public.aplicari drop constraint aplicari_cifra_afaceri_check, drop constraint aplicari_stare_check;
alter table public.aplicari
  add constraint aplicari_cifra_afaceri_check check (cifra_afaceri = any (array['sub-500k','500k-1m','1m-3m','3m-10m','10m-25m','peste-25m'])),
  add constraint aplicari_stare_check check (stare = any (array['incompletă','nouă','contactat','acceptat','respins'])),
  add constraint aplicari_raspunsuri_check check (pg_column_size(raspunsuri) <= 20000);
