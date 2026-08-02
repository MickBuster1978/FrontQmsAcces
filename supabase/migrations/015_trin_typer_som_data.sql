-- supabase/migrations/015_trin_typer_som_data.sql
-- Trin-typer bliver DATA i stedet for en fast liste i koden - samme
-- mønster som document_kategorier: globale starttyper (org_id null)
-- + virksomhedens egne tilføjelser (fx en metalsvejsevirksomhed, som
-- intet har at gøre med "hakning" og "optøning").
--
-- De 15 oprindelige typer beholder deres eksisterende id'er som
-- globale starttyper, så attribute_definitions og hazard_definitions
-- IKKE skal ændres - de refererer allerede til de samme id-strenge.
-- Idempotent.

-- ============================================================
-- 1. TABEL
-- ============================================================

create table if not exists public.step_type_definitions (
  id         text primary key,
  org_id     uuid references public.organizations(id) on delete cascade, -- null = delt starttype
  label      text not null,
  sort_order int not null default 100
);

alter table public.step_type_definitions enable row level security;

drop policy if exists "steptype_select_authenticated" on public.step_type_definitions;
create policy "steptype_select_authenticated"
  on public.step_type_definitions for select
  to authenticated
  using (org_id is null or org_id in (select public.user_org_ids()));

drop policy if exists "steptype_insert_member" on public.step_type_definitions;
create policy "steptype_insert_member"
  on public.step_type_definitions for insert
  to authenticated
  with check (org_id in (select public.user_org_ids()));

-- ============================================================
-- 2. SEED: de 15 eksisterende typer som globale starttyper
--    (samme id'er som attribute_definitions/hazard_definitions
--    allerede peger på - intet andet skal ændres)
-- ============================================================

insert into public.step_type_definitions (id, org_id, label, sort_order) values
  ('modtagelse',      null, 'Modtagelse',      10),
  ('koelelagring',    null, 'Kølelagring',     20),
  ('frostlagring',    null, 'Frostlagring',    30),
  ('optoening',       null, 'Optøning',        40),
  ('opskaering',      null, 'Opskæring',       50),
  ('hakning',         null, 'Hakning',         60),
  ('tilsaetning',     null, 'Tilsætning',      70),
  ('vejning',         null, 'Vejning',         80),
  ('pakning',         null, 'Pakning',         90),
  ('maerkning',       null, 'Mærkning',        100),
  ('metaldetektion',  null, 'Metaldetektion',  110),
  ('frysning',        null, 'Frysning',        120),
  ('forsendelse',     null, 'Forsendelse',     130),
  ('transport',       null, 'Transport',       140),
  ('intern_flytning', null, 'Intern flytning', 150)
on conflict (id) do update set
  label      = excluded.label,
  sort_order = excluded.sort_order;

-- ============================================================
-- 3. process_steps.step_type: fjern den gamle faste liste-constraint,
--    erstat med en rigtig reference til step_type_definitions.
--    (Seed køres FØR dette, så alle eksisterende værdier allerede
--    findes i tabellen - constraint'en kan ikke fejle på egne data.)
-- ============================================================

do $$
declare
  con_name text;
begin
  select conname into con_name
  from pg_constraint
  where conrelid = 'public.process_steps'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%step_type%';

  if con_name is not null then
    execute format('alter table public.process_steps drop constraint %I', con_name);
  end if;
end $$;

alter table public.process_steps
  drop constraint if exists process_steps_step_type_fkey;

alter table public.process_steps
  add constraint process_steps_step_type_fkey
  foreign key (step_type) references public.step_type_definitions(id);

-- ============================================================
-- VERIFIKATION
-- ============================================================

select 'tabel' as tjek, count(*)::text as resultat
from information_schema.tables
where table_schema = 'public' and table_name = 'step_type_definitions'
union all
select 'globale starttyper', count(*)::text
from public.step_type_definitions where org_id is null
union all
select 'fk på process_steps', count(*)::text
from pg_constraint
where conrelid = 'public.process_steps'::regclass
  and conname = 'process_steps_step_type_fkey';
