-- supabase/migrations/010_linked_hazard.sql
-- Kobler CCP/oPRP-trekanter på canvas til en RIGTIG, bekræftet fare
-- fra risikomodulet, i stedet for et frit tekstfelt der bare ligner.
-- Idempotent.

alter table public.process_steps
  add column if not exists linked_hazard_id uuid
    references public.step_hazards(id) on delete set null;

comment on column public.process_steps.linked_hazard_id is
  'Kun relevant for node_shape = trekant_ccp/trekant_oprp. Peger på den
   bekræftede fare i step_hazards diagram-trekanten repræsenterer.';

-- ============================================================
-- VERIFIKATION
-- ============================================================

select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'process_steps'
  and column_name = 'linked_hazard_id';
