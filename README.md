# todo-calendar

캘린더 기반 할일(Todo) 웹서비스. 월간 캘린더에서 날짜를 클릭해 할일을 등록하고, 우측 서랍(Drawer)에서 위지윅 에디터로 내용을 작성·수정한다. 조회는 누구나 가능하고, 등록/수정/삭제는 로그인한 소유자만 가능하다.

## 기술 스택

- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui, Lucide React
- **Backend**: Supabase (Postgres DB, Auth, Storage)
- **배포**: Vercel

아키텍처 설계(DB 스키마, RLS 정책, 인증 흐름, 컴포넌트 구조)와 단계별 작업 계획은 [`ROADMAP.md`](./ROADMAP.md)에, 개발 시 지켜야 할 규칙과 연동 계정 현황은 [`CLAUDE.md`](./CLAUDE.md)에 정리되어 있다.

## 시작하기

의존성 설치 후 개발 서버를 실행한다.

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 결과를 확인할 수 있다.

Supabase 연동이 필요한 기능(인증, DB, 이미지 업로드)을 사용하려면 `.env.local`에 아래 환경 변수가 필요하다. 값은 `CLAUDE.md`의 "연동 계정 및 외부 서비스 현황"과 Supabase 대시보드(Settings > API)를 참고한다.

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=
```

## 개발 명령어

```bash
npm run dev      # 개발 서버 시작
npm run build    # 프로덕션 빌드
npm run start    # 프로덕션 서버 시작
npm run lint     # ESLint 실행
```

## 배포

[Vercel](https://vercel.com)에 배포할 예정이다. 배포 절차는 `ROADMAP.md`의 Phase 6을 따른다.
