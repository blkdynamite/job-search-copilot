-- FirstHour — resume Storage bucket
--
-- Bucket names are global to the project, so it is site-prefixed: `firsthour-resumes`.
-- Files are stored under `<user_id>/...`. The app writes via the service role; these RLS
-- policies additionally let a signed-in user read/manage only their own folder. Scoped tightly to
-- this bucket so no other app's Storage objects are affected.

insert into storage.buckets (id, name, public)
values ('firsthour-resumes', 'firsthour-resumes', false)
on conflict (id) do nothing;

do $$ begin
  create policy "firsthour_resumes_read_own" on storage.objects
    for select to authenticated
    using (bucket_id = 'firsthour-resumes' and (storage.foldername(name))[1] = auth.uid()::text);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "firsthour_resumes_insert_own" on storage.objects
    for insert to authenticated
    with check (bucket_id = 'firsthour-resumes' and (storage.foldername(name))[1] = auth.uid()::text);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "firsthour_resumes_update_own" on storage.objects
    for update to authenticated
    using (bucket_id = 'firsthour-resumes' and (storage.foldername(name))[1] = auth.uid()::text);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "firsthour_resumes_delete_own" on storage.objects
    for delete to authenticated
    using (bucket_id = 'firsthour-resumes' and (storage.foldername(name))[1] = auth.uid()::text);
exception when duplicate_object then null; end $$;
