-- supabase/migrations/003_firma_profil.sql
-- Udvider organizations med virksomhedsprofil-felter + opdaterings-policy.
-- Idempotent – kan køres flere gange uden skade.

-- ============================================================
-- 1. NYE KOLONNER
-- ============================================================

alter table public.organizations
  add column if not exists autorisationsnr text,
  add column if not exists adresse         text,
  add column if not exists postnr          text,
  add column if not exists by              text,
  add column if not exists telefon         text,
  add column if not exists email           text,
  add column if not exists kontaktperson   text,
  add column if not exists aktiviteter     text,   -- fritekst: hvad producerer/håndterer I
  add column if not exists antal_ansatte   int;

comment on column public.organizations.autorisationsnr is
  'Fødevarestyrelsens autorisationsnummer';
comment on column public.organizations.aktiviteter is
  'Beskrivelse af aktiviteter/produkter – bruges senere af risikomotor og AI';

-- ============================================================
-- 2. POLICY: kun admin kan opdatere virksomhedens profil
-- ============================================================

drop policy if exists "org_update_admin" on public.organizations;
create policy "org_update_admin"
  on public.organizations for update
  using (
    id in (select public.user_org_ids())
    and exists (
      select 1 from public.memberships m
      where m.org_id = organizations.id
        and m.user_id = auth.uid()
        and m.role = 'admin'
    )
  )
  with check (
    id in (select public.user_org_ids())
  );

-- ============================================================
-- 3. VERIFIKATION
-- ============================================================

select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'organizations'
order by ordinal_position;
