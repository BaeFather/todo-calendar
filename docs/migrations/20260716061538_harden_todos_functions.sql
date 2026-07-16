-- set_updated_at: search_path 고정 (handle_new_user와 동일한 방어 패턴 적용)
-- Supabase 보안 어드바이저(function_search_path_mutable) 경고 대응
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 트리거 전용 함수이므로 REST RPC 경로(anon/authenticated)로 직접 호출될 필요가 없음
-- Supabase 보안 어드바이저(anon/authenticated_security_definer_function_executable) 경고 대응
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
