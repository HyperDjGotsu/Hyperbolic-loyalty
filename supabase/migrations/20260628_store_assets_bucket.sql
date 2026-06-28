insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'store-assets',
  'store-assets',
  true,
  512000, -- 500 KB
  array['image/png','image/jpeg','image/webp','image/gif','image/svg+xml']
)
on conflict (id) do nothing;

create policy "store assets public read"
on storage.objects for select
using (bucket_id = 'store-assets');

create policy "store assets staff upload"
on storage.objects for insert
with check (bucket_id = 'store-assets');

create policy "store assets staff update"
on storage.objects for update
using (bucket_id = 'store-assets');

create policy "store assets staff delete"
on storage.objects for delete
using (bucket_id = 'store-assets');
