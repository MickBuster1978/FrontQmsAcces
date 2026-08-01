-- supabase/migrations/008_node_shape.sql
-- Trin får en visuel form (node_shape), uafhængig af step_type.
-- Beslutningspunkter (romber) og start/slut-markører (cirkler) er
-- stadig fulde process_steps-rækker – bare uden en fysisk trin-type.
-- Derfor gøres step_type nullable (CHECK-constraint tillader NULL
-- i forvejen efter SQL-standarden, så eksisterende data er upåvirket).
-- Idempotent.

alter table public.process_steps
  add column if not exists node_shape text not null default 'rektangel'
    check (node_shape in ('rektangel', 'rombe', 'cirkel'));

alter table public.process_steps
  alter column step_type drop not null;

-- ============================================================
-- VERIFIKATION
-- ============================================================

select column_name, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'process_steps'
  and column_name in ('step_type', 'node_shape')
order by column_name;
