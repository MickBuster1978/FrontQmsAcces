-- supabase/migrations/009_node_shape_udvidet.sql
-- Udvider node_shape fra 3 til 6 værdier: cirkel, rektangel, kvadrat,
-- rombe, trekant_oprp, trekant_ccp. Finder og dropper den gamle
-- CHECK-constraint dynamisk (uanset dens auto-genererede navn), så
-- migrationen er sikker at køre uanset hvad den hed før.
-- Idempotent.

do $$
declare
  con_name text;
begin
  select conname into con_name
  from pg_constraint
  where conrelid = 'public.process_steps'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%node_shape%';

  if con_name is not null then
    execute format('alter table public.process_steps drop constraint %I', con_name);
  end if;
end $$;

alter table public.process_steps
  add constraint process_steps_node_shape_check
  check (node_shape in (
    'cirkel', 'rektangel', 'kvadrat', 'rombe', 'trekant_oprp', 'trekant_ccp'
  ));

-- ============================================================
-- VERIFIKATION
-- ============================================================

select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.process_steps'::regclass
  and contype = 'c'
  and pg_get_constraintdef(oid) like '%node_shape%';
