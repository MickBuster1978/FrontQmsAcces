-- supabase/migrations/018_allergener_og_kontrolforanstaltning.sql
-- To rettelser der bringer skemaet på linje med den rigtige HACCP-metode:
--
-- 1. Allergener bliver en fjerde fare-kategori (var gemt under 'kemisk').
-- 2. step_hazards.begrundelse omdøbes til kontrolforanstaltning - det er
--    den konkrete kontrol (temperaturlogning, metaldetektor), ikke en
--    begrundelse for klassificeringen.
--
-- Idempotent.

-- ============================================================
-- 1. Udvid kategori-constraint til 4 kategorier, begge tabeller
-- ============================================================

do $$
declare con_name text;
begin
  select conname into con_name
  from pg_constraint
  where conrelid = 'public.hazard_definitions'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%category%';
  if con_name is not null then
    execute format('alter table public.hazard_definitions drop constraint %I', con_name);
  end if;
end $$;

alter table public.hazard_definitions
  add constraint hazard_definitions_category_check
  check (category in ('biologisk', 'kemisk', 'fysisk', 'allergener'));

do $$
declare con_name text;
begin
  select conname into con_name
  from pg_constraint
  where conrelid = 'public.step_hazards'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%category%';
  if con_name is not null then
    execute format('alter table public.step_hazards drop constraint %I', con_name);
  end if;
end $$;

alter table public.step_hazards
  add constraint step_hazards_category_check
  check (category in ('biologisk', 'kemisk', 'fysisk', 'allergener'));

-- ============================================================
-- 2. Omklassificér de to allergen-relevante fareregler
-- ============================================================

update public.hazard_definitions
set category = 'allergener'
where id in ('till_allergen', 'maerk_allergen');

-- Allerede materialiserede step_hazards-rækker fra disse regler skal
-- følge med, ellers grupperes de forkert i den 4-kategori-inddelte UI.
update public.step_hazards
set category = 'allergener'
where hazard_def_id in ('till_allergen', 'maerk_allergen');

-- ============================================================
-- 3. Omdøb begrundelse -> kontrolforanstaltning
-- ============================================================

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'step_hazards'
      and column_name = 'begrundelse'
  ) then
    alter table public.step_hazards rename column begrundelse to kontrolforanstaltning;
  end if;
end $$;

-- ============================================================
-- VERIFIKATION
-- ============================================================

select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid in ('public.hazard_definitions'::regclass, 'public.step_hazards'::regclass)
  and contype = 'c'
  and pg_get_constraintdef(oid) like '%category%';

select id, category from public.hazard_definitions
where id in ('till_allergen', 'maerk_allergen');

select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'step_hazards'
  and column_name in ('begrundelse', 'kontrolforanstaltning');
