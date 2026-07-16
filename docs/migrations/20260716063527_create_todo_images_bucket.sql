insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('todo-images', 'todo-images', true, 5242880, array['image/png','image/jpeg','image/webp','image/gif']);

create policy "todo_images_select_public" on storage.objects
  for select using (bucket_id = 'todo-images');

create policy "todo_images_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'todo-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "todo_images_update_own" on storage.objects
  for update using (
    bucket_id = 'todo-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "todo_images_delete_own" on storage.objects
  for delete using (
    bucket_id = 'todo-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
