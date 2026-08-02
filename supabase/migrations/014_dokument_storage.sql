-- supabase/migrations/014_dokument_storage.sql
-- Opretter en PRIVAT storage-bucket til dokumenter + adgangsregler.
-- Filer gemmes under {org_id}/{dokument_id}/{filnavn} - reglerne
-- tjekker at første sti-del matcher en af brugerens organisationer,
-- via den allerede etablerede user_org_ids()-funktion (samme mønster
-- som resten af skemaet, ikke en ny adgangsmodel).
-- Idempotent.

insert into storage.buckets (id, name, public)
values ('dokumenter', 'dokumenter', false)
on conflict (id) do nothing;

drop policy if exists "dokumenter_storage_select" on storage.objects;
create policy "dokumenter_storage_select"
on storage.objects for select
to authenticated
using (
  bucket_id = 'dokumenter'
  and exists (
    select 1 from public.user_org_ids() uid
    where uid::text = (storage.foldername(name))[1]
  )
);

drop policy if exists "dokumenter_storage_insert" on storage.objects;
create policy "dokumenter_storage_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'dokumenter'
  and exists (
    select 1 from public.user_org_ids() uid
    where uid::text = (storage.foldername(name))[1]
  )
);

drop policy if exists "dokumenter_storage_update" on storage.objects;
create policy "dokumenter_storage_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'dokumenter'
  and exists (
    select 1 from public.user_org_ids() uid
    where uid::text = (storage.foldername(name))[1]
  )
);

drop policy if exists "dokumenter_storage_delete" on storage.objects;
create policy "dokumenter_storage_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'dokumenter'
  and exists (
    select 1 from public.user_org_ids() uid
    where uid::text = (storage.foldername(name))[1]
  )
);

-- ============================================================
-- VERIFIKATION
-- ============================================================

select id, name, public from storage.buckets where id = 'dokumenter';

select policyname
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and policyname like 'dokumenter_storage_%'
order by policyname;
