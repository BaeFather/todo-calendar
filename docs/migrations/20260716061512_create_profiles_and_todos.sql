-- profiles: 공개 프로필 (auth.users의 민감정보를 직접 노출하지 않기 위한 최소 공개 테이블)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_public" on public.profiles
  for select using (true);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(new.email, '@', 1));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- todos: 캘린더에 표시되는 할일
create table public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  content jsonb not null,
  date date not null,
  image_paths text[] not null default '{}',
  is_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index todos_date_idx on public.todos (date);
create index todos_user_id_idx on public.todos (user_id);
create index todos_date_user_idx on public.todos (date, user_id);

create function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger todos_set_updated_at
  before update on public.todos
  for each row execute function public.set_updated_at();

alter table public.todos enable row level security;

-- 조회: 로그인 여부 무관 전체 공개
create policy "todos_select_public" on public.todos
  for select using (true);

-- 생성: 본인 소유로만
create policy "todos_insert_own" on public.todos
  for insert with check (auth.uid() = user_id);

-- 수정: 본인 글만
create policy "todos_update_own" on public.todos
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 삭제: 본인 글만
create policy "todos_delete_own" on public.todos
  for delete using (auth.uid() = user_id);
