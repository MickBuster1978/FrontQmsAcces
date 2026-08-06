-- supabase/migrations/021_dokument_historik.sql
-- Arkiverer en FULD kopi af et dokument lige før hver redigering
-- overskriver det. Selve dokumentet i "dokumenter" forbliver den
-- nuværende sandhed, uændret i sin opbygning; historikken lever
-- ved siden af.
-- Idempotent.

create table if not exists public.dokument_versioner (
  id                uuid primary key default gen_random_uuid(),
  dokument_id       uuid not null references public.dokumenter(id) on delete cascade,
  org_id            uuid not null references public.organizations(id) on delete cascade,
  titel             text not null,
  version           text not null,
  status            text not null,
  ansvarlig         text,
  beskrivelse       text,
  fil_sti           text,
  oprettet_dato     date,
  gennemgaaet_dato  date,
  udloeber_dato     date,
  ccp_oprp_type     text,
  arkiveret_at      timestamptz not null default now()
);

create index if not exists idx_dokumentversioner_dokument
  on public.dokument_versioner (dokument_id);

alter table public.dokument_versioner enable row level security;

drop policy if exists "dokumentversioner_all_member" on public.dokument_versioner;
create policy "dokumentversioner_all_member"
  on public.dokument_versioner for all
  using (org_id in (select public.user_org_ids()))
  with check (org_id in (select public.user_org_ids()));

-- ============================================================
-- VERIFIKATION
-- ============================================================

select 'tabel' as tjek, count(*)::text as resultat
from information_schema.tables
where table_schema = 'public' and table_name = 'dokument_versioner'
union all
select 'policies', count(*)::text
from pg_policies
where schemaname = 'public' and tablename = 'dokument_versioner';
