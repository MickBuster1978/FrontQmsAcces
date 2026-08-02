-- supabase/migrations/016_dokument_diagram_kobling.sql
-- Kobler et flowdiagram til et dokument i dokumentstyringsmodulet.
-- Et dokument er enten en uploadet fil (fil_sti) ELLER en levende
-- reference til et diagram (diagram_id) - aldrig begge på samme
-- række i praksis, men begge er nullable så det ikke håndhæves stift.
-- Idempotent.

alter table public.dokumenter
  add column if not exists diagram_id uuid
    references public.flow_diagrams(id) on delete cascade;

create index if not exists idx_dokumenter_diagram on public.dokumenter (diagram_id);

insert into public.document_kategorier (id, org_id, label, beskrivelse, sort_order)
values (
  'flowdiagrammer', null, 'Flowdiagrammer',
  'Registrerede flowdiagrammer - det første trin i HACCP-metoden.', 45
)
on conflict (id) do update set
  label       = excluded.label,
  beskrivelse = excluded.beskrivelse,
  sort_order  = excluded.sort_order;

-- ============================================================
-- VERIFIKATION
-- ============================================================

select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'dokumenter'
  and column_name = 'diagram_id';

select id, label, sort_order from public.document_kategorier order by sort_order;
