-- supabase/migrations/012_diagram_datoer.sql
-- Styringsdatoer på diagrammet: oprettelse, verificering, fornyelse
-- og ny version. Det er dokumentstyrings-datoer (dem en auditor
-- spørger til), adskilt fra rækkens tekniske created_at.
-- Idempotent.

alter table public.flow_diagrams
  add column if not exists oprettet_dato    date,
  add column if not exists verificeret_dato date,
  add column if not exists fornyelse_dato   date,
  add column if not exists ny_version_dato  date;

-- Udfyld oprettet_dato fra den tekniske oprettelsesdato, hvor den mangler
update public.flow_diagrams
set oprettet_dato = created_at::date
where oprettet_dato is null;

-- ============================================================
-- VERIFIKATION
-- ============================================================

select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'flow_diagrams'
order by ordinal_position;
