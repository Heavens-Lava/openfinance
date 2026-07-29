-- Run once in the Supabase SQL editor. The bucket is private; every object
-- path begins with the authenticated user's UUID.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'macyfinance-files',
  'macyfinance-files',
  false,
  10485760,
  array['text/csv', 'text/csv;charset=utf-8', 'application/vnd.ms-excel']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "MacyFinance users can read their own files" on storage.objects;
create policy "MacyFinance users can read their own files"
on storage.objects for select
to authenticated
using (
  bucket_id = 'macyfinance-files'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "MacyFinance users can upload their own files" on storage.objects;
create policy "MacyFinance users can upload their own files"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'macyfinance-files'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "MacyFinance users can update their own files" on storage.objects;
create policy "MacyFinance users can update their own files"
on storage.objects for update
to authenticated
using (
  bucket_id = 'macyfinance-files'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'macyfinance-files'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "MacyFinance users can delete their own files" on storage.objects;
create policy "MacyFinance users can delete their own files"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'macyfinance-files'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
