-- 퍼블릭 버킷은 getPublicUrl() 접근에 RLS SELECT 정책이 불필요하며(RLS 우회),
-- 이 정책은 오히려 storage API를 통한 버킷 리스팅을 허용해 보안 어드바이저(public_bucket_allows_listing) 경고를 유발함
drop policy "todo_images_select_public" on storage.objects;
