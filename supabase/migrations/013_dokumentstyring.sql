-- supabase/migrations/013_dokumentstyring.sql
-- Dokumentstyringsmodulet: kategorier som DATA (samme lektie som
-- trin-typerne - ingen virksomheder strukturerer dokumenter ens),
-- plus selve dokumenterne med status og styringsdatoer.
-- Fil-upload (Supabase Storage) kobles på i en senere batch - fil_sti
-- er klar til det, men intet skriver til den endnu.
-- Idempotent.

-- ============================================================
-- 1. DOKUMENTKATEGORIER (globale + evt. org-specifikke)
-- ============================================================

create table if not exists public.document_kategorier (
  id          text primary key,
  org_id      uuid references public.organizations(id) on delete cascade, -- null = delt af alle
  label       text not null,
  beskrivelse text,
  sort_order  int not null default 100
);

-- ============================================================
-- 2. DOKUMENTER
-- ============================================================

create table if not exists public.dokumenter (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references public.organizations(id) on delete cascade,
  kategori_id       text not null references public.document_kategorier(id),
  titel             text not null,
  version           text not null default '1.0',
  status            text not null default 'udkast'
                       check (status in ('udkast','gaeldende','under_revision','udgaaet')),
  ansvarlig         text,
  beskrivelse       text,
  fil_sti           text,        -- klar til Supabase Storage-reference, ubrugt endnu
  oprettet_dato     date,
  gennemgaaet_dato  date,
  udloeber_dato     date,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_dokumenter_org      on public.dokumenter (org_id);
create index if not exists idx_dokumenter_kategori on public.dokumenter (kategori_id);

-- ============================================================
-- 3. RLS
-- ============================================================

alter table public.document_kategorier enable row level security;
alter table public.dokumenter          enable row level security;

drop policy if exists "dokkat_select_authenticated" on public.document_kategorier;
create policy "dokkat_select_authenticated"
  on public.document_kategorier for select
  to authenticated
  using (org_id is null or org_id in (select public.user_org_ids()));

drop policy if exists "dokkat_insert_member" on public.document_kategorier;
create policy "dokkat_insert_member"
  on public.document_kategorier for insert
  to authenticated
  with check (org_id in (select public.user_org_ids()));

drop policy if exists "dokumenter_all_member" on public.dokumenter;
create policy "dokumenter_all_member"
  on public.dokumenter for all
  using (org_id in (select public.user_org_ids()))
  with check (org_id in (select public.user_org_ids()));

-- ============================================================
-- 4. SEED: startkategorier (RET TIL efter jeres virkelighed)
-- ============================================================

insert into public.document_kategorier (id, org_id, label, beskrivelse, sort_order)
values
  ('ccp_oprp', null, 'CCP/oPRP',
   'Procedurer og verifikationsdokumentation for kritiske kontrolpunkter og forudsætningsprogrammer.', 10),
  ('processer', null, 'Processer',
   'Procedurer og arbejdsinstruktioner for de enkelte processer.', 20),
  ('politik', null, 'Politik',
   'Fødevaresikkerheds- og kvalitetspolitik.', 30),
  ('traening', null, 'Træning',
   'Træningsplaner, kompetencer og uddannelsesbeviser.', 40),
  ('risikoanalyser', null, 'Risikoanalyser',
   'Dokumenteret risikoanalyse og HACCP-plan.', 50),
  ('egenkontrol', null, 'Egenkontrol',
   'Egenkontrolprogram og tilhørende registreringer.', 60),
  ('beredskab', null, 'Beredskab',
   'Beredskabsplaner ved tilbagekaldelse, nedbrud og andre kriser.', 70),
  ('sporbarhed', null, 'Sporbarhed',
   'Procedurer for sporbarhed frem og tilbage i kæden.', 80),
  ('leverandoerer', null, 'Leverandører',
   'Leverandørgodkendelse og -evaluering.', 90)
on conflict (id) do update set
  label       = excluded.label,
  beskrivelse = excluded.beskrivelse,
  sort_order  = excluded.sort_order;

-- ============================================================
-- 5. VERIFIKATION
-- ============================================================

select 'tabeller' as tjek, count(*)::text as resultat
from information_schema.tables
where table_schema = 'public'
  and table_name in ('document_kategorier','dokumenter')
union all
select 'kategorier', count(*)::text from public.document_kategorier
union all
select 'policies', count(*)::text
from pg_policies
where schemaname = 'public'
  and tablename in ('document_kategorier','dokumenter');
