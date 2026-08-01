-- supabase/migrations/007_risikoanalyse.sql
-- Risikoanalyse som data: fareregler (globale forslag) + trin-farer (org-data).
-- Farerne foreslås ud fra trin-type og trin-fakta (åbent produkt, personkontakt),
-- og brugeren bekræfter/retter/afviser dem - ikke et blankt skema.
-- Idempotent.

-- ============================================================
-- 1. FAREREGLER (globale - driver forslagene, som attribute_definitions)
-- ============================================================

create table if not exists public.hazard_definitions (
  id                      text primary key,
  category                text not null check (category in ('biologisk','kemisk','fysisk')),
  label                   text not null,
  description             text,
  applies_to_step_types   text[] not null default '{}',  -- tomt = gælder alle typer
  requires_product_open   boolean,                        -- null = ligegyldigt
  requires_person_contact boolean,
  default_sandsynlighed   smallint not null default 1 check (default_sandsynlighed between 1 and 3),
  default_konsekvens      smallint not null default 1 check (default_konsekvens between 1 and 3),
  standard_ref            text,
  sort_order              int not null default 100
);

-- ============================================================
-- 2. TRIN-FARER (org-data - de faktiske vurderinger pr. trin)
-- ============================================================

create table if not exists public.step_hazards (
  id             uuid primary key default gen_random_uuid(),
  step_id        uuid not null references public.process_steps(id) on delete cascade,
  org_id         uuid not null references public.organizations(id) on delete cascade,
  hazard_def_id  text references public.hazard_definitions(id) on delete set null,
  category       text not null check (category in ('biologisk','kemisk','fysisk')),
  label          text not null,
  description    text,
  sandsynlighed  smallint not null default 1 check (sandsynlighed between 1 and 3),
  konsekvens     smallint not null default 1 check (konsekvens between 1 and 3),
  risikoscore    smallint generated always as (sandsynlighed * konsekvens) stored,
  er_ccp         boolean not null default false,
  er_oprp        boolean not null default false,
  begrundelse    text,
  status         text not null default 'forslag' check (status in ('forslag','bekraeftet','afvist')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_stephazards_step on public.step_hazards (step_id);
create index if not exists idx_stephazards_org  on public.step_hazards (org_id);

-- ============================================================
-- 3. RLS
-- ============================================================

alter table public.hazard_definitions enable row level security;
alter table public.step_hazards       enable row level security;

drop policy if exists "hazarddef_select_authenticated" on public.hazard_definitions;
create policy "hazarddef_select_authenticated"
  on public.hazard_definitions for select
  to authenticated
  using (true);

drop policy if exists "stephazards_all_member" on public.step_hazards;
create policy "stephazards_all_member"
  on public.step_hazards for all
  using (org_id in (select public.user_org_ids()))
  with check (org_id in (select public.user_org_ids()));

-- ============================================================
-- 4. SEED: fareregler (kød/engros-startsæt - domæneviden, RET TIL)
-- ============================================================

insert into public.hazard_definitions
  (id, category, label, description, applies_to_step_types,
   requires_product_open, requires_person_contact,
   default_sandsynlighed, default_konsekvens, standard_ref, sort_order)
values
  ('modt_patogener', 'biologisk', 'Patogene mikroorganismer i råvaren',
   'Salmonella, E. coli, Campylobacter m.fl. ved brudt kølekæde under transport eller ved ikke-godkendt leverandør.',
   array['modtagelse'], null, null, 2, 3, 'IFS 8: 4.4', 10),

  ('modt_fremmedlegemer', 'fysisk', 'Fremmedlegemer i emballage eller råvare',
   'Glas, metal eller plastikrester fra leverandørens produktion eller transport.',
   array['modtagelse'], null, null, 1, 2, null, 11),

  ('modt_kemisk_rest', 'kemisk', 'Restkoncentrationer i råvaren',
   'Rengørings-/desinfektionsmiddelrester eller veterinærmedicin (antibiotikarester).',
   array['modtagelse'], null, null, 1, 2, null, 12),

  ('koel_temp_afvigelse', 'biologisk', 'Temperaturafvigelse i kølelager',
   'Vækst af patogene og fordærvelsesfremkaldende mikroorganismer hvis kølekæden brydes.',
   array['koelelagring'], null, null, 2, 3, null, 20),

  ('koel_krydskontam', 'biologisk', 'Krydskontaminering ved fælles kølelagring',
   'Overførsel mellem råvarer og andre produkter ved fælles, uadskilt opbevaring.',
   array['koelelagring'], true, null, 2, 2, null, 21),

  ('frost_temp_afvigelse', 'biologisk', 'Temperaturafvigelse i frostlager',
   'Strømsvigt eller anlægsfejl kan tillade delvis optøning og mikrobiel vækst.',
   array['frostlagring'], null, null, 1, 3, null, 30),

  ('optoe_mikrobiel_vaekst', 'biologisk', 'Mikrobiel vækst under optøning',
   'For langsom eller for varm optøning tillader vækst, særligt i produktets overflade.',
   array['optoening'], null, null, 2, 3, null, 40),

  ('opsk_metal', 'fysisk', 'Metalfragmenter fra knive/udstyr',
   'Slidte knivsklinger eller udstyr kan afgive metalfragmenter til produktet.',
   array['opskaering'], null, null, 2, 2, null, 50),

  ('opsk_krydskontam', 'biologisk', 'Krydskontaminering ved håndtering',
   'Overførsel mellem produkter/overflader ved manuel bearbejdning.',
   array['opskaering'], null, true, 2, 2, null, 51),

  ('opsk_temp_stigning', 'biologisk', 'Temperaturstigning under bearbejdning',
   'Forlænget tid i rumtemperatur under opskæring øger mikrobiel vækst.',
   array['opskaering'], null, null, 2, 2, null, 52),

  ('hak_metal', 'fysisk', 'Metalfragmenter fra hakkemaskine',
   'Slitage på hakkemaskinens knive og plader kan afgive metalfragmenter.',
   array['hakning'], null, null, 2, 2, null, 60),

  ('hak_temp_friktion', 'biologisk', 'Temperaturstigning ved friktionsvarme',
   'Hakning genererer friktionsvarme, som øger mikrobiel vækst - forstærkes ved blanding af flere partier.',
   array['hakning'], null, null, 2, 2, null, 61),

  ('hak_rework_krydskontam', 'biologisk', 'Krydskontaminering ved rework',
   'Tilbageføring af overskudsprodukt uden tilstrækkelig temperaturkontrol.',
   array['hakning'], null, null, 2, 2, null, 62),

  ('till_allergen', 'kemisk', 'Fejlallergen eller krydskontaminering',
   'Forkert dosering eller forbytning af ingrediens kan introducere et umærket allergen.',
   array['tilsaetning'], null, null, 2, 3, 'IFS 8: 4.19', 70),

  ('till_overdosering', 'kemisk', 'Overdosering af tilsætningsstof',
   'Fx nitrit/nitrat i saltlage ud over lovlig grænseværdi.',
   array['tilsaetning'], null, null, 1, 3, null, 71),

  ('till_kontam_ingrediens', 'biologisk', 'Kontaminering af tilsætning inden brug',
   'Forkert opbevaring af ingrediens/lage inden tilsætning.',
   array['tilsaetning'], null, null, 1, 2, null, 72),

  ('vej_fremmedlegeme', 'fysisk', 'Fremmedlegemer fra vejeudstyr',
   'Afskalning eller slid fra vægtskål og udstyr.',
   array['vejning'], null, null, 1, 1, null, 80),

  ('vej_krydskontam', 'biologisk', 'Krydskontaminering ved håndtering på vægt',
   'Overførsel mellem forskellige produkter/allergener under vejning.',
   array['vejning'], null, true, 1, 2, null, 81),

  ('pak_anaerob_vaekst', 'biologisk', 'Vækst af anaerobe patogener i modificeret atmosfære',
   'Vakuum/MAP kan begrænse aerob fordærv men tillade Clostridium botulinum eller Listeria monocytogenes ved util tilstrækkelig temperaturkontrol.',
   array['pakning'], null, null, 2, 3, null, 90),

  ('pak_fremmedlegeme', 'fysisk', 'Fremmedlegemer fra emballagemateriale',
   'Plastik- eller filmrester ved forsegling.',
   array['pakning'], null, null, 1, 1, null, 91),

  ('pak_migration', 'kemisk', 'Migration fra emballagematerialet',
   'Forkert emballagevalg kan lade stoffer migrere til fødevaren.',
   array['pakning'], null, null, 1, 2, null, 92),

  ('maerk_allergen', 'kemisk', 'Forkert eller manglende allergenmærkning',
   'Kritisk lovkrav - forkert mærkning kan udgøre alvorlig fare for allergiske forbrugere.',
   array['maerkning'], null, null, 2, 3, 'IFS 8: 4.19', 100),

  ('metal_fejlkalibrering', 'fysisk', 'Utilstrækkelig detektion af metal',
   'Forkert kalibrering eller for stor testemnestørrelse gør at detektoren ikke fanger reelle fremmedlegemer.',
   array['metaldetektion'], null, null, 1, 3, 'IFS 8: 4.12.2', 110),

  ('frys_langsom_nedfrysning', 'biologisk', 'For langsom nedfrysning',
   'Toksinproducerende bakterier kan nå at danne toksin før frysning bremser væksten.',
   array['frysning'], null, null, 1, 2, null, 120),

  ('forsend_temp_afvigelse', 'biologisk', 'Temperaturafvigelse ved forsendelse',
   'Utilstrækkelig køling af transportmiddel eller lang ventetid på rampe.',
   array['forsendelse'], null, null, 2, 2, null, 130),

  ('transp_temp_afvigelse', 'biologisk', 'Temperaturafvigelse under transport',
   'Fejl på køleaggregat eller for lang transporttid.',
   array['transport'], null, null, 2, 2, null, 140),

  ('transp_krydskontam_kemi', 'kemisk', 'Krydskontaminering ved fælles transport',
   'Fælles transport med ikke-fødevarer eller kemikalier.',
   array['transport'], null, null, 1, 2, null, 141),

  ('intern_krydskontam_zone', 'biologisk', 'Krydskontaminering mellem zoner',
   'Flytning mellem fx rå-zone og ren-zone uden tilstrækkelig adskillelse.',
   array['intern_flytning'], null, null, 2, 2, null, 150),

  ('generel_personalekontakt', 'biologisk', 'Mikrobiel kontaminering fra personalekontakt',
   'Håndkontaminering (fx Staphylococcus aureus) overføres til åbent/ubeskyttet produkt, uanset trin-type.',
   array[]::text[], true, true, 2, 2, null, 200)
on conflict (id) do update set
  category                = excluded.category,
  label                   = excluded.label,
  description             = excluded.description,
  applies_to_step_types   = excluded.applies_to_step_types,
  requires_product_open   = excluded.requires_product_open,
  requires_person_contact = excluded.requires_person_contact,
  default_sandsynlighed   = excluded.default_sandsynlighed,
  default_konsekvens      = excluded.default_konsekvens,
  standard_ref            = excluded.standard_ref,
  sort_order              = excluded.sort_order;

-- ============================================================
-- 5. VERIFIKATION
-- ============================================================

select 'tabeller' as tjek, count(*)::text as resultat
from information_schema.tables
where table_schema = 'public'
  and table_name in ('hazard_definitions','step_hazards')
union all
select 'fareregler', count(*)::text from public.hazard_definitions
union all
select 'policies', count(*)::text
from pg_policies
where schemaname = 'public'
  and tablename in ('hazard_definitions','step_hazards');
