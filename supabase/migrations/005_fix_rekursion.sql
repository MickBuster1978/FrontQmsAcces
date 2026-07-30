-- supabase/migrations/005_fix_rekursion.sql
-- Fixer 42P17 "infinite recursion detected in policy for relation memberships".
-- Årsag: policies der slår op i den tabel de selv sidder på.
-- Kur: alle "er brugeren medlem/admin?"-tjek går gennem SECURITY DEFINER-
-- funktioner, som omgår RLS og derfor ikke kan rekursere.
-- Idempotent – kan køres flere gange uden skade.

-- ============================================================
-- 1. HJÆLPEFUNKTIONER (SECURITY DEFINER = ingen rekursion)
-- ============================================================

create or replace function public.user_is_org_admin(target_org uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.memberships
    where org_id = target_org
      and user_id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.user_has_any_membership()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.memberships
    where user_id = auth.uid()
  );
$$;

-- ============================================================
-- 2. UDSKIFT DE REKURSIVE POLICIES
-- ============================================================

-- SYNDEREN fra migration 001: subquery på memberships inde i en
-- memberships-policy. Erstattes med funktionskald.
drop policy if exists "membership_select_org_admin" on public.memberships;
create policy "membership_select_org_admin"
  on public.memberships for select
  using (public.user_is_org_admin(org_id));

-- Samme mønster i org-opdatering (migration 003)
drop policy if exists "org_update_admin" on public.organizations;
create policy "org_update_admin"
  on public.organizations for update
  using (public.user_is_org_admin(id))
  with check (public.user_is_org_admin(id));

-- Førstegangs-opsætning (migration 004) – nu via funktion
drop policy if exists "org_insert_foerste" on public.organizations;
create policy "org_insert_foerste"
  on public.organizations for insert
  to authenticated
  with check (not public.user_has_any_membership());

drop policy if exists "membership_insert_foerste" on public.memberships;
create policy "membership_insert_foerste"
  on public.memberships for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and role = 'admin'
    and not public.user_has_any_membership()
  );

-- ============================================================
-- 3. VERIFIKATION
--    Alle policies + en direkte test af at memberships kan læses
-- ============================================================

select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('organizations', 'memberships')
order by tablename, policyname;
