# ROADMAP — 캘린더 기반 Todo 웹서비스

이 문서는 현재 마케팅형 스타터킷(Next.js 16 App Router) 위에 "캘린더 기반 할일(Todo) 웹서비스"를 구축하기 위한 아키텍처 설계와 단계별 작업 계획을 담는다. 각 Phase의 작업 항목은 완료 시 체크(`[x]`)하여 진행 상황을 추적한다.

---

> **연동 계정 및 외부 서비스 현황**은 `CLAUDE.md`로 이동했다. Supabase 프로젝트 정보, MCP 서버 연동 상태 등은 그쪽을 참고한다.

---

## 1. 개요 및 핵심 아키텍처 결정

이 서비스는 **개인 전용 캘린더가 아니라, 모두의 할일이 하나의 공개 캘린더에 함께 표시되는 구조**다.

- **조회(읽기)**: 로그인 여부와 무관하게 누구나 캘린더와 각 할일의 상세 내용을 볼 수 있다.
- **쓰기(생성/수정/삭제)**: 반드시 로그인한 본인 소유의 글에 대해서만 가능하다.

이 전제는 DB 조회 쿼리(전체 유저 대상 조회), RLS 정책(SELECT 공개 / INSERT·UPDATE·DELETE 소유자 한정), UI 분기(내 글에만 수정·삭제 버튼 노출) 전반에 영향을 준다.

### 확정된 주요 의사결정

| 항목 | 결정 | 이유 |
|---|---|---|
| 이미지 저장소 | Supabase Storage | Vercel 서버리스 환경은 파일시스템이 읽기 전용이라 런타임에 업로드된 파일을 로컬 디렉토리에 영구 저장할 수 없음 |
| 인증 방식 | Supabase Auth | 자체적으로 JWT를 발급하며 Postgres RLS와 자연스럽게 연동되어 "JWT 인증 + 소유자 권한 강제"를 동시에 만족 |
| Notion API | 이번 스코프에서 제외 | 할일 데이터는 전부 Supabase DB에 저장하므로 별도 CMS 불필요 |
| 위지윅 에디터 | Tiptap | ProseMirror 스키마 기반이라 raw HTML 삽입을 구조적으로 차단 가능, 이미지 드래그앤드롭 공식 확장 지원 |
| 공휴일 데이터 소스 | 공공데이터포털(한국천문연구원_특일 정보, `getRestDeInfo`) | 정부 공식 데이터라 신뢰도가 높고, 임시공휴일·대체공휴일도 발표 즉시 반영되어 별도 유지보수 없이 매년 자동으로 최신 상태 유지 (11장 참고) |

---

## 2. 기술 스택

**Frontend**
- Next.js 16 (App Router), TypeScript
- Tailwind CSS v4, shadcn/ui (`radix-nova`)
- Lucide React (아이콘)
- react-hook-form + zod (폼/검증) — 기존 스타터킷 패턴 재사용
- sonner (토스트) — 기존 스타터킷 패턴 재사용
- Tiptap (위지윅 에디터)
- date-fns (날짜 계산, 신규 추가)

**Backend**
- Supabase
  - Postgres DB (todos, profiles)
  - Supabase Auth (이메일/비밀번호, JWT 기반)
  - Supabase Storage (이미지 업로드)
- Vercel (배포)

**이번 스코프 제외**
- Notion API — 향후 별도 콘텐츠(공지/블로그) 섹션이 필요해지면 재검토

---

## 3. Supabase DB 스키마

### profiles 테이블

전체 공개 조회 구조이므로 `auth.users`를 직접 노출할 수 없다(이메일 등 민감정보 포함). 최소 공개 프로필 테이블을 두고 회원가입 시 트리거로 자동 생성한다.

```sql
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
```

### todos 테이블

```sql
create table public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  content jsonb not null,                     -- Tiptap editor.getJSON() 결과 (8장 참고)
  date date not null,                          -- 캘린더 셀에 매핑되는 날짜
  image_paths text[] not null default '{}',    -- Storage 경로 배열 (정리용 메타데이터)
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
```

`user_id`에 `default auth.uid()`를 걸어 클라이언트가 값을 조작해도 실제 저장되는 값은 서버 세션 기준이 되도록 한다(RLS와 이중 방어).

### RLS 정책 (핵심)

```sql
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
```

### 성능 고려사항

캘린더 셀에는 `title`만으로 pill을 렌더링하고, `content`(Tiptap JSON)는 드로어를 열 때만 lazy-load한다. 월간 뷰에서 수십~수백 개의 Tiptap 인스턴스를 동시에 띄우는 성능 문제를 피하기 위함이다.

---

## 4. Supabase Storage 설계

### 버킷

- 이름: `todo-images`, **public 버킷**(조회가 전체 공개이므로 이미지도 서명 URL 없이 공개 URL로 노출)
- mime 제한: `image/png`, `image/jpeg`, `image/webp`, `image/gif`
- 파일 크기 제한: 5MB

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('todo-images', 'todo-images', true, 5242880, array['image/png','image/jpeg','image/webp','image/gif']);
```

### 경로 규칙

`{user_id}/{uuid}.{ext}` — 신규 할일 작성 중에는 아직 `todo.id`가 없는 상태에서 이미지 드래그가 발생하므로, todo 단위가 아닌 유저 단위 flat 구조를 사용한다.

### Storage RLS

```sql
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
```

### 업로드 흐름 (Tiptap 드래그 앤 드롭 시점)

1. 사용자가 에디터에 이미지를 드롭 → Tiptap `editorProps.handleDrop`(붙여넣기는 `handlePaste`)에서 가로챔
2. 임시 로딩 placeholder 삽입, 브라우저 기본 처리(base64 인라인 삽입)는 차단
3. **드롭 시점에 즉시** 브라우저에서 `supabase.storage.from('todo-images').upload(...)` 호출 — 폼 제출을 기다리지 않음. Vercel 서버리스 함수를 경유하지 않으므로 함수 타임아웃/파일시스템 제약과 무관하며, 보안은 위 RLS로 보장
4. 업로드 성공 시 `getPublicUrl()`로 공개 URL을 얻어 placeholder를 이미지 노드로 교체
5. 실패 시 sonner 토스트로 에러 노출, placeholder 제거
6. 폼 저장 시 Tiptap JSON에서 실제 사용 중인 이미지 URL을 추출해 `todos.image_paths`에 기록 (추후 고아 이미지 정리 배치의 기반 데이터, Phase 7 백로그)

---

## 5. 인증 아키텍처

### 클라이언트 분리 (`@supabase/ssr`)

- `src/lib/supabase/client.ts` — `createBrowserClient`, `"use client"` 컴포넌트(로그인/회원가입 폼, 이미지 업로드, 로그아웃)에서 사용
- `src/lib/supabase/server.ts` — `createServerClient` + `next/headers`의 `cookies()` (기존 `layout.tsx`가 이미 `await cookies()` 패턴을 사용 중이므로 동일 컨벤션), Server Component/Server Action에서 사용
- `src/lib/supabase/middleware.ts` — `updateSession` 헬퍼, 요청/응답에 바인딩된 클라이언트로 `getUser()` 호출해 세션 쿠키 갱신

### `src/middleware.ts`

정적 자산(`_next/static`, 이미지, favicon 등) 제외 매처 설정, 모든 요청에서 세션 쿠키 refresh만 수행한다. 조회는 비로그인도 허용되므로 강제 로그인 리다이렉트 로직은 두지 않는다.

### 기존 더미 폼 교체

- `src/components/auth/login-form.tsx`: `onSubmit`의 `setTimeout` 목업을 `supabase.auth.signInWithPassword({ email, password })`로 교체, 에러 시 `toast.error(error.message)`, 성공 시 `router.push('/')` + `router.refresh()`
- `src/components/auth/signup-form.tsx`: `supabase.auth.signUp({ email, password, options: { emailRedirectTo } })`
- 신규 `src/app/auth/callback/route.ts`: 이메일 확인 코드 교환용 Route Handler(`exchangeCodeForSession`)
- 두 폼 모두 기존 `react-hook-form` + `zod`(`src/lib/validations/auth.ts`) 구조는 그대로 두고 `onSubmit` 내부 로직만 교체

### 헤더 로그인 상태 분기

`src/app/layout.tsx`(이미 async Server Component)에서 서버 Supabase 클라이언트로 `auth.getUser()` 호출 후 `SiteHeader`에 `user` prop 전달. 신규 `src/components/auth/user-nav.tsx`(기존 `dropdown-menu.tsx` 재사용) — 로그인 시 닉네임 표시 + 로그아웃, 비로그인 시 기존 로그인 버튼 유지. `onAuthStateChange` 구독으로 클라이언트-서버 상태 동기화.

---

## 6. 폴더/라우트 구조

```
src/
  app/
    layout.tsx                    # 서버에서 user 조회 → SiteHeader에 전달 (수정)
    page.tsx                      # 캘린더 메인 페이지로 교체
    login/page.tsx                # 기존 유지
    signup/page.tsx               # 기존 유지
    auth/callback/route.ts        # 신규: 이메일 확인 콜백
    actions/todos.ts              # 신규: Server Actions (create/update/delete/getById)
  components/
    calendar/
      calendar-page.tsx           # 그리드+드로어 컨테이너 (선택 상태 관리)
      calendar-grid.tsx           # 월간 그리드
      calendar-cell.tsx           # 일자 셀
      calendar-header.tsx         # 이전/다음 달 네비게이션
      todo-pill.tsx               # 셀 내 개별 할일 항목
    todo-drawer/
      todo-drawer.tsx             # shadcn Sheet 래핑, create/edit 모드 분기
      todo-form.tsx               # react-hook-form + zod + Tiptap 연동
      delete-todo-button.tsx      # 소유자 전용 삭제 확인
    editor/
      tiptap-editor.tsx
      tiptap-toolbar.tsx
      extensions.ts
      upload-image.ts
    auth/
      login-form.tsx              # 실제 Supabase 호출로 수정
      signup-form.tsx              # 실제 Supabase 호출로 수정
      user-nav.tsx                 # 신규
    layout/
      site-header.tsx             # user prop 분기 (수정)
  lib/
    supabase/{client,server,middleware}.ts
    validations/
      auth.ts                    # 기존 유지
      todo.ts                    # 신규
    date/calendar.ts             # date-fns 기반 월 매트릭스 계산
  hooks/                          # 신규 디렉토리 (alias는 이미 구성됨)
  types/database.types.ts         # supabase gen types 산출물
  middleware.ts                   # 세션 갱신
```

API Route Handler는 `auth/callback` 외에는 원칙적으로 불필요하다 — RLS가 보안 경계이므로 클라이언트에서 supabase-js를 직접 호출해도 안전하며, CRUD는 Server Actions로 처리한다.

---

## 7. 캘린더 + 드로어 UI 아키텍처

### 그리드: 직접 구현

FullCalendar/react-big-calendar 같은 무거운 라이브러리는 채택하지 않는다. 요구사항은 "월간 그리드 + 날짜별 리스트 + 클릭 시 드로어"뿐이라 드래그 리사이즈/타임슬롯/다중 뷰가 불필요하고, shadcn/Tailwind 디자인 토큰과 100% 일치하는 스타일링이 필요하기 때문이다. `date-fns`(`startOfMonth`, `eachDayOfInterval`, `addMonths`)로 6주(42칸) 그리드를 구성한다.

### 데이터 흐름

- `app/page.tsx`(Server Component)가 `?month=YYYY-MM` 쿼리를 파싱 → 서버 Supabase 클라이언트로 `select id, title, date, user_id, profiles(display_name)` + 해당 월 범위 조회(전체 유저 대상)
- 결과를 `Map<날짜, Todo[]>`로 그룹핑해 `CalendarGrid`에 전달
- 로그인 유저 정보도 함께 내려 `user.id === todo.user_id` 비교로 수정/삭제 아이콘 노출 여부 결정 (실제 강제는 RLS)

### 드로어 상태/모드 전환

`calendar-page.tsx`(client)에서 단일 상태로 관리:

```ts
type DrawerState =
  | { mode: "create"; date: Date }
  | { mode: "edit"; todoId: string }
  | null
```

- 빈 셀/"+" 클릭 → create 모드로 Sheet 오픈
- 기존 pill 클릭 → edit 모드로 오픈, 드로어가 열릴 때 상세 데이터 lazy-load 후 `form.reset(todo)`
- 폼은 기존 `login-form.tsx` 패턴 재사용(`useForm + zodResolver`, shadcn `form.tsx`), `content` 필드만 `Controller`로 Tiptap과 바인딩
- 제출 시 `startTransition` 내에서 Server Action 호출 → 성공 시 토스트 + Sheet 닫힘 + `revalidatePath`
- 삭제는 edit 모드 + 본인 글일 때만 노출

기존 `src/components/ui/sheet.tsx`를 그대로 사용하되, 기본 `sm:max-w-sm`은 에디터가 들어가기엔 좁으므로 `className`으로 `sm:max-w-lg` 이상으로 넓힌다.

---

## 8. Tiptap 통합

### 패키지

`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-image`, `@tiptap/extension-placeholder`, `@tiptap/extension-link`

### 저장 포맷: HTML 문자열이 아니라 Tiptap JSON(JSONB)

Tiptap은 설치된 확장이 정의하는 ProseMirror 스키마 안에서만 문서를 구성한다. 사용자가 `<script>...</script>`를 타이핑해도 contentEditable은 이를 리터럴 텍스트로 취급할 뿐, `setContent(rawHtmlString)`을 직접 호출하지 않는 한 HTML로 파싱/실행되지 않는다.

저장 시 `editor.getJSON()`을 그대로 DB에 넣고, 읽기 화면도 **읽기 전용 Tiptap 인스턴스(`editable:false`)**로 동일 JSON을 렌더링한다. `dangerouslySetInnerHTML`로 저장된 HTML을 직접 주입하는 경로를 아예 만들지 않는 것이 핵심 방어선이다 — JSON은 스키마에 없는 노드/속성을 애초에 표현할 수 없으므로 별도 sanitize 라이브러리 없이도 안전하다.

붙여넣기로 유입되는 외부 HTML도 ProseMirror paste 파이프라인이 동일 스키마로 파싱하므로 스키마에 없는 태그는 자동으로 걸러진다. 추가 방어로 `editorProps.transformPastedHTML`에서 `<script>`/`<style>` 태그를 명시적으로 제거하는 전처리를 둔다.

### 확장 구성 (MVP)

- `StarterKit` (heading [1,2,3] 등으로 제한)
- `Image`: `inline:false`, **`allowBase64:false`**(드래그 이미지가 반드시 Storage 업로드 경로를 타도록 강제)
- `Placeholder`: 빈 에디터 안내 문구
- `Link`: `protocols: ["http", "https", "mailto"]`로 제한(`javascript:` 프로토콜 인젝션 차단)
- 커스텀: `editorProps.handleDrop`/`handlePaste`에서 파일 드롭/붙여넣기를 가로채 4장의 업로드 흐름 실행

### 서버 측 검증

Server Action에서 `content` JSON을 재검증 — 저장 전 `doc` 루트 타입과 허용된 노드 타입만 존재하는지 얕은 화이트리스트 검사(defense-in-depth).

---

## 9. 환경 변수 (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=       # 서버 전용, NEXT_PUBLIC_ 접두어 금지
NEXT_PUBLIC_SITE_URL=            # auth 콜백 redirect 구성용
HOLIDAY_API_SERVICE_KEY=         # 서버 전용, 공공데이터포털 공휴일 API(11장 참고)
```

Vercel 배포 시 Production/Preview/Development 환경별로 각각 등록해야 하며, `NEXT_PUBLIC_SITE_URL`은 프리뷰마다 도메인이 달라지므로 Vercel의 `VERCEL_URL` 시스템 환경변수를 조합해 동적으로 구성하는 방식도 고려한다(Preview 환경에 빈 값으로 등록되어 있어 실제로 문제가 발생 중, Phase 6 체크리스트 참고).

---

## 10. 단계별 작업 체크리스트

### Phase 0 — Supabase 프로젝트 셋업
- [x] Supabase 프로젝트 생성 (`todo-calendar`, Northeast Asia(Seoul) 리전, project ref `hnastywqcrwhsamytdnl`)
- [x] URL/anon(publishable) key 확보 및 `.env.local` 반영
- [ ] service role(secret) key 확보 (RLS 우회 권한이라 대시보드 API Keys > Legacy 탭에서 직접 복사 필요, 실제 사용 시점에 진행)
- [x] `@supabase/supabase-js`, `@supabase/ssr` 설치
- [x] `.env.local` 작성
- [x] `src/lib/supabase/client.ts` 작성
- [x] `src/lib/supabase/server.ts` 작성
- [x] `src/lib/supabase/middleware.ts` 작성
- [x] `src/proxy.ts`에 세션 갱신 로직 연결 (Next.js 16부터 `middleware.ts`가 `proxy.ts`로 대체됨)

### Phase 1 — 인증
- [x] `login-form.tsx`를 `signInWithPassword` 실호출로 교체
- [x] `signup-form.tsx`를 `signUp` 실호출로 교체
- [x] `app/auth/callback/route.ts` 구현
- [x] Supabase 대시보드 "Confirm email" 정책 결정 (필수로 결정, 대시보드 기본값과 일치 — Supabase 신규 프로젝트는 기본적으로 활성화되어 있음)
- [x] `layout.tsx`에서 서버 유저 조회 후 `SiteHeader`에 전달
- [x] `components/auth/user-nav.tsx` 구현 (로그인 상태 드롭다운 + 로그아웃)
- [x] `onAuthStateChange` 구독 처리로 클라이언트-서버 상태 동기화
- [x] 로그인/로그아웃/회원가입 전체 플로우 수동 검증 (Playwright로 잘못된 자격증명 에러 토스트, 실제 회원가입 인증메일 발송까지 확인. 이메일 링크 클릭 후 콜백 처리는 실제 메일함 접근이 필요해 사용자 확인 필요)

### Phase 2 — DB 스키마 + RLS
- [x] `profiles` 테이블 생성 및 RLS 정책 적용
- [x] `handle_new_user` 트리거 등록
- [x] `todos` 테이블 생성 (컬럼/인덱스)
- [x] `todos` RLS 정책 적용 (select 공개 / insert·update·delete 소유자)
- [x] `set_updated_at` 트리거 등록 (Supabase 보안 어드바이저 권고로 `search_path` 고정 및 `anon`/`authenticated` 실행 권한 회수 추가 적용, `docs/migrations/` 참고)
- [x] `supabase gen types typescript`로 `src/types/database.types.ts` 생성 (Supabase MCP `generate_typescript_types` 사용)
- [x] Supabase 클라이언트에 제네릭 타입 연결

### Phase 3 — 캘린더 UI
- [x] `date-fns` 설치
- [x] `src/lib/date/calendar.ts` 작성 (월 매트릭스 계산 함수)
- [x] `components/calendar/calendar-grid.tsx` 구현
- [x] `components/calendar/calendar-cell.tsx` 구현
- [x] `components/calendar/calendar-header.tsx` 구현 (이전/다음 달 네비게이션)
- [x] `components/calendar/todo-pill.tsx` 구현
- [x] `app/page.tsx`에서 월별 서버 조회 및 그리드 렌더링 연결 (todos·profiles 조인은 FK 관계가 없어 PostgREST embed 대신 두 번의 조회 후 JS에서 병합)

### Phase 4 — 드로어 + 폼 + 에디터
- [x] Tiptap 패키지 설치 (v3 — StarterKit이 Link를 기본 포함해 `@tiptap/extension-link`는 별도 설치하지 않음)
- [x] `components/editor/extensions.ts` 구성 (이미지 제외 기본 서식)
- [x] `components/editor/tiptap-editor.tsx`, `tiptap-toolbar.tsx` 구현
- [x] `lib/validations/todo.ts` 작성 (Tiptap 노드/마크 화이트리스트 검증 포함, 클라이언트/Server Action 공용)
- [x] `components/todo-drawer/todo-drawer.tsx` 구현 (create/edit 모드 분기)
- [x] `components/todo-drawer/todo-form.tsx` 구현 (react-hook-form + FormField + Tiptap 바인딩)
- [x] `app/actions/todos.ts` Server Actions 구현 (create/update/delete/getById)
- [x] `components/todo-drawer/delete-todo-button.tsx` 구현 (소유자 전용 노출)
- [x] Sheet 너비 조정(`sm:max-w-lg` 이상)
- [x] Playwright로 등록/수정/삭제 전체 플로우 실제 Supabase 데이터로 검증

### Phase 5 — 이미지 업로드
- [x] `todo-images` 버킷 생성 및 mime/size 제한 설정
- [x] `storage.objects` RLS 정책 적용 (퍼블릭 버킷은 SELECT 정책이 불필요 — 버킷 리스팅만 허용하게 되어 보안 어드바이저 경고 유발, 적용 직후 제거함. `docs/migrations/` 참고)
- [x] `components/editor/upload-image.ts` 구현
- [x] Tiptap `handleDrop`/`handlePaste` 연결 (blob: 미리보기를 임시 placeholder로 삽입 → 업로드 성공 시 공개 URL로 교체, 실패 시 제거)
- [x] 업로드 중 로딩 placeholder 처리
- [x] 업로드 실패 시 에러 토스트 처리
- [x] `image_paths` 저장 로직 연결
- [x] Playwright + 실제 Supabase Storage로 업로드·저장 전체 플로우 검증

**트러블슈팅**: `editor.getJSON()`의 이미지 노드 `attrs`가 ProseMirror 내부 객체를 참조로 유지해, Server Action 인자로 그대로 넘기면 Next.js가 "Cannot access src on the server. You cannot dot into a temporary client reference from a server component" 런타임 에러를 던짐(dev 서버 재시작으로도 재현되는 실제 버그였음, `.next/dev/logs/next-development.log`로 서버 측 원인 확인). `todo-form.tsx`의 `onSubmit`에서 `JSON.parse(JSON.stringify(values.content))`로 완전히 새로운 순수 객체 그래프를 만들어 전달하도록 수정해 해결.

### Phase 6 — 배포 (Vercel)
- [x] Vercel 프로젝트 연결 (`baefathers-projects/todo-calendar`, Vercel CLI로 로컬 디렉토리 직접 배포 — 아직 GitHub 저장소가 없어 git 연동 대신 CLI 배포 방식 사용)
- [x] Production/Preview/Development 환경변수 등록 (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`)
- [x] Supabase Auth Site URL / Redirect URLs에 Vercel 도메인 등록 (프로덕션 도메인 + 프리뷰 배포 와일드카드 + 로컬 개발 URL)
- [x] `next build` 로컬 검증 (Phase 0~5 전 과정에서 반복 확인)
- [x] 프로덕션 배포 (`https://todo-calendar-dun.vercel.app`) — 로그인, 캘린더 데이터 조회까지 실제 배포 환경에서 확인
- [x] 프리뷰 배포에서 이미지 업로드 플로우 점검 — 이미지 업로드는 `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY`만 사용하고 배포 도메인과 무관하며, 이 값들은 Preview 환경에도 정상 등록되어 있음(`vercel env ls`로 확인). 프로덕션에서 이미 실제 업로드까지 검증됐으므로 환경별 재검증 불필요로 판단, 별도 UI 재현 생략
- [ ] 프리뷰 배포에서 이메일 인증 플로우 점검 — **버그 발견**: `signup-form.tsx`의 `emailRedirectTo`가 `NEXT_PUBLIC_SITE_URL`을 사용하는데, Vercel Preview 환경변수의 `NEXT_PUBLIC_SITE_URL`이 빈 문자열로 등록되어 있음(`vercel env pull --environment=preview`로 확인). 프리뷰에서 회원가입 시 인증 메일의 콜백 링크가 깨지거나(상대경로) Supabase 대시보드 기본 Site URL(프로덕션 도메인)로 폴백될 것으로 예상됨. 수정은 보류 — 추후 `emailRedirectTo`를 `NEXT_PUBLIC_SITE_URL` 대신 Vercel 시스템 환경변수(`VERCEL_URL`) 기반으로 동적 구성하도록 변경 필요(본 문서 9번 섹션에 이미 언급된 우려가 실제로 미해결 상태였음을 확인)

### Phase 7 — 백로그 (이번 스코프 제외)
- [ ] 고아 이미지 정리 크론 (Edge Function)
- [ ] Notion API 연동 (콘텐츠 섹션 필요 시 재검토)
- [ ] 검색/필터 기능
- [ ] 무한 스크롤 또는 페이지네이션

---

## 11. 공휴일 표시 기능 (공공데이터 연동, MVP 이후 추가)

캘린더에서 토/일요일과 공휴일 날짜 숫자를 빨간색(`#FF2222`)으로 표시하는 기능. Phase 0~6 완료 이후 추가로 요청되어 구현했다.

### 데이터 소스

공공데이터포털(data.go.kr)의 **한국천문연구원_특일 정보(`SpcdeInfoService`)** 서비스 중 **`getRestDeInfo`(공휴일 정보조회)** 오퍼레이션만 사용한다. 발급받은 서비스키가 이 오퍼레이션 호출만 허용하도록 설정되어 있어 다른 오퍼레이션(국경일/기념일/24절기/잡절 정보조회)은 사용하지 않는다.

- 엔드포인트: `https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo`
- 요청 파라미터: `solYear`(연도), `ServiceKey`(서비스키), `numOfRows=100`(연간 공휴일이 20건 내외라 여유있게 설정), `_type=json`
- 응답: `response.body.items.item` 배열(항목 1건일 때는 배열이 아닌 단일 객체로 오는 경우가 있어 방어 코드 필요), 각 항목의 `locdate`(yyyyMMdd 숫자)를 `yyyy-MM-dd` 문자열로 변환해 사용
- 데이터 갱신: 정기 데이터는 연 1회, 임시공휴일은 발표 후 1일 이내, 대체공휴일은 대통령령 시행 후 반영(제공기관 공지 기준)

### 구현 위치

- `src/lib/holidays/get-holidays.ts` — `getHolidayDateSet(years: number[])`: 연도별로 API를 호출해 공휴일 날짜를 `Set<string>`으로 병합 반환. `fetch`에 `next: { revalidate: 60 * 60 * 24 }`(1일)를 지정해 불필요한 반복 호출을 줄임. 서비스키가 없거나 API 호출이 실패하면 빈 배열을 반환해(예외를 던지지 않음) 캘린더 자체는 항상 정상 렌더링되도록 함(공휴일만 표시가 안 될 뿐, 페이지가 깨지지 않음)
- `src/app/page.tsx` — 캘린더 그리드가 걸쳐 있는 연도(월초/월말이 다른 해에 걸치는 경우 두 해 모두)를 계산해 `getHolidayDateSet`을 호출, `holidays: Set<string>` prop을 `CalendarPage`로 전달
- `CalendarPage` → `CalendarGrid`/`CalendarDayList`(PC·모바일 양쪽 뷰) → `CalendarCell`까지 `holidays` prop을 그대로 전달
- `CalendarCell`, `CalendarDayList`: `day.getDay() === 0 || day.getDay() === 6 || holidays.has(toDateKey(day))`이면 날짜 숫자에 `text-[#FF2222]` 적용(단, "오늘" 강조 스타일이 우선)

### 환경 변수

`HOLIDAY_API_SERVICE_KEY` — 서버 전용(NEXT_PUBLIC_ 접두어 없음), `.env.local`과 Vercel Production/Preview/Development 전체에 등록 완료. 9장 참고.

### 알려진 이슈

Preview 환경의 `NEXT_PUBLIC_SITE_URL`이 빈 값으로 등록되어 있는 문제(Phase 6 체크리스트 참고)는 이 기능과 무관 — 공휴일 API는 `NEXT_PUBLIC_SITE_URL`을 전혀 사용하지 않으므로 프리뷰 배포에서도 정상 동작한다.
