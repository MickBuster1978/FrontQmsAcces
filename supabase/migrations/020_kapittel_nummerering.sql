-- supabase/migrations/020_kapittel_nummerering.sql
-- Kapittelnummerering: hver kategori er et "hovedkapittel" (1, 2, 3...),
-- og hvert dokument får et løbenummer INDEN FOR sit kapittel (1.001,
-- 1.002, 2.001...). Nummeret tildeles én gang ved oprettelse og
-- ændres aldrig bagefter - heller ikke hvis andre dokumenter slettes.
-- Idempotent.

alter table public.document_kategorier
  add column if not exists kapittel_nummer int;

alter table public.dokumenter
  add column if not exists dokument_nummer int;

drop index if exists idx_kategori_kapittel_unik;
create unique index idx_kategori_kapittel_unik
  on public.document_kategorier (kapittel_nummer)
  where kapittel_nummer is not null;

-- ============================================================
-- Kapittelnumre på de 10 kendte kategorier, i deres nuværende
-- rækkefølge (sort_order). Ren opstart - ret frit i tabellen bagefter.
-- ============================================================

update public.document_kategorier set kapittel_nummer = 1  where id = 'ccp_oprp';
update public.document_kategorier set kapittel_nummer = 2  where id = 'processer';
update public.document_kategorier set kapittel_nummer = 3  where id = 'politik';
update public.document_kategorier set kapittel_nummer = 4  where id = 'traening';
update public.document_kategorier set kapittel_nummer = 5  where id = 'flowdiagrammer';
update public.document_kategorier set kapittel_nummer = 6  where id = 'risikoanalyser';
update public.document_kategorier set kapittel_nummer = 7  where id = 'egenkontrol';
update public.document_kategorier set kapittel_nummer = 8  where id = 'beredskab';
update public.document_kategorier set kapittel_nummer = 9  where id = 'sporbarhed';
update public.document_kategorier set kapittel_nummer = 10 where id = 'leverandoerer';

-- ============================================================
-- Eksisterende dokumenter nummereres inden for hver kategori, i den
-- rækkefølge de blev oprettet (created_at). Rammer intet hvis der
-- ikke findes dokumenter endnu.
-- ============================================================

with nummereret as (
  select id, row_number() over (partition by kategori_id order by created_at) as rn
  from public.dokumenter
  where dokument_nummer is null
)
update public.dokumenter d
set dokument_nummer = n.rn
from nummereret n
where d.id = n.id;

-- ============================================================
-- VERIFIKATION
-- ============================================================

select id, label, kapittel_nummer
from public.document_kategorier
order by kapittel_nummer;

select d.titel, k.kapittel_nummer, d.dokument_nummer
from public.dokumenter d
join public.document_kategorier k on k.id = d.kategori_id
order by k.kapittel_nummer, d.dokument_nummer;
