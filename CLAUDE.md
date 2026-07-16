# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 언어 및 커뮤니케이션 규칙

- **기본 응답 언어**: 한국어
- **코드 주석**: 한국어로 작성
- **커밋 메시지**: 한국어로 작성 (Conventional Commits 접두사 `feat:`, `fix:`, `docs:`, `chore:` 등 사용 가능)
- **문서화**: 한국어로 작성
- **변수명/함수명**: 영어 (코드 표준 준수)

## 개발 명령어

```bash
npm run dev      # 개발 서버 시작 (http://localhost:3000)
npm run build    # 프로덕션 빌드
npm run start    # 프로덕션 서버 시작
npm run lint     # ESLint 실행
```

새 shadcn 컴포넌트 추가:
```bash
npx shadcn@latest add <component>
```

**E2E 테스트(Playwright)**: `@playwright/test`는 devDependency로 설치되어 있지만, 아직 `playwright.config.ts`와 테스트 파일이 없다. 새로 추가할 경우 설정 파일부터 작성한 뒤 `npx playwright test`(전체 실행) / `npx playwright test --ui`(UI 모드)로 실행한다.

**Claude Code hook 설정**: 개인 로컬 Bash 로깅·Slack 알림 hook은 `docs/claude-code-hooks.md`에 정리되어 있다. 저장소를 새로 clone했다면 이 문서를 참고해 `.claude/settings.local.json`을 직접 구성해야 한다.

## 연동 계정 및 외부 서비스 현황

실제로 연동을 마친 외부 계정/서비스 상태를 기록한다. 새로운 계정을 연동하거나 정보가 바뀔 때마다 이 섹션을 갱신한다.

### Supabase

| 항목 | 값 |
|---|---|
| 계정 | sori9th@gmail.com |
| 조직(Org) | `sori9th@gmail.com's Org` (Free Plan) |
| 프로젝트명 | `todo-calendar` |
| 리전 | Northeast Asia (Seoul, `ap-northeast-2`) |
| Project ref | `hnastywqcrwhsamytdnl` |
| Project URL | `https://hnastywqcrwhsamytdnl.supabase.co` |
| anon(publishable) key | `.env.local`의 `NEXT_PUBLIC_SUPABASE_ANON_KEY`에 저장됨 |
| service role(secret) key | 미확보 (RLS 우회 권한이 있는 민감 키라 자동화로 캡처하지 않음, 필요 시 대시보드 API Keys > Legacy 탭에서 직접 복사) |
| DB 비밀번호 | Supabase가 자동 생성, 별도 저장 안 함 (앱은 supabase-js REST + RLS 방식이라 직접 접속 불필요, 필요 시 대시보드에서 재발급) |

### MCP 서버 연동 (`.mcp.json`, 이 프로젝트에서만 동작)

| 서버 | 인증 방식 | 스코프 |
|---|---|---|
| `vercel` | OAuth (`/mcp`에서 브라우저 인증) | 계정 전체 (아직 이 프로젝트가 Vercel에 연결되지 않아 프로젝트 스코프 미지정) |
| `supabase` | OAuth (`/mcp`에서 브라우저 인증) | `project_ref=hnastywqcrwhsamytdnl`로 `todo-calendar` 프로젝트에 한정 |

### Vercel

| 항목 | 값 |
|---|---|
| 계정 | baefather (Vercel CLI OAuth 인증) |
| 팀/스코프 | `baefathers-projects` (`team_CtbPm0AWktlm6MS5o27nakrd`) |
| 프로젝트명 | `todo-calendar` (`prj_O3kPLu81QxMdMhgwWxcnXTfKy6Zs`) |
| 프로덕션 도메인 | `https://todo-calendar-dun.vercel.app` |
| 연동 방식 | GitHub 저장소가 아직 없어 Vercel CLI(`vercel link` / `vercel deploy --prod`)로 로컬 디렉토리를 직접 배포. 이후 GitHub 연동 시 자동 배포로 전환 가능 |
| 환경변수 | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`을 Production/Preview/Development 전체에 등록 완료 |
| Supabase Auth 연동 | Site URL을 프로덕션 도메인으로 변경, Redirect URLs에 로컬(`http://localhost:3000/**`)·프로덕션(`https://todo-calendar-dun.vercel.app/**`)·프리뷰 와일드카드(`https://todo-calendar-*-baefathers-projects.vercel.app/**`) 등록 |

## 진행 중인 기능: 캘린더 기반 Todo 웹서비스

현재 이 스타터킷 위에 캘린더 기반 할일 서비스를 구축하는 작업이 진행 중이다. 아키텍처 설계(DB 스키마, RLS 정책, Storage 설계, 인증 흐름, 컴포넌트 구조)와 Phase별 작업 체크리스트는 `ROADMAP.md`에 정리되어 있다. 관련 코드를 작업하기 전에 반드시 이 문서를 먼저 확인한다.

## 아키텍처 개요

Next.js 16 App Router 기반 마케팅/콘텐츠형 스타터킷. 헤더 + 콘텐츠 + 푸터 레이아웃.

### 핵심 패턴

**클래스 병합**: 항상 `cn()` (`src/lib/utils.ts`) 사용
```ts
import { cn } from "@/lib/utils"
```

**shadcn 컴포넌트 패턴**: `cva` + `data-slot` + `asChild`/Radix `Slot` (기존 `button.tsx` 참조)

**공통 훅**: 직접 구현 전 `usehooks-ts` 우선 확인
```ts
import { useMediaQuery, useLocalStorage, useDebounceValue } from "usehooks-ts"
```

**폼**: `react-hook-form` + `zod` + `@hookform/resolvers`
```ts
const form = useForm<z.infer<typeof schema>>({
  resolver: zodResolver(schema),
})
```

**토스트**: `sonner`
```ts
import { toast } from "sonner"
toast.success("성공!")
```

**사이트 정보**: 네비 링크·이름·설명·URL은 `src/config/site.ts`에서만 수정

### 다크모드 — 쿠키 기반 SSR

`next-themes`를 사용하지 않고 커스텀 ThemeProvider(`src/components/providers/theme-provider.tsx`)를 직접 구현했다.

흐름:
1. `layout.tsx`(서버)가 `cookies()`로 `"theme"` 쿠키를 읽어 `initialTheme`으로 ThemeProvider에 전달
2. ThemeProvider(클라이언트)가 `initialTheme`으로 초기 상태를 세팅 → hydration 깜빡임 없음
3. 테마 변경 시 `localStorage`와 `document.cookie` 양쪽 동기화

다크모드 훅은 `useTheme()`을 ThemeProvider에서 직접 import:
```ts
import { useTheme } from "@/components/providers/theme-provider"
const { theme, setTheme, resolvedTheme } = useTheme()
```

### 스타일링

- Tailwind CSS v4 (`@import "tailwindcss"`) + `tw-animate-css` + `shadcn/tailwind.css`
- CSS 변수 기반 디자인 토큰 (`globals.css`의 `:root` / `.dark` 블록), oklch 색공간
- 다크모드: `.dark` 클래스 토글 방식 (`globals.css`의 `@custom-variant dark (&:is(.dark *))`)
- 폰트: `--font-geist-sans` → CSS 변수 `--font-sans`로 연결됨

### 주요 설정

- React Compiler 활성화 (`next.config.ts`) — 수동 `useMemo`/`useCallback` 불필요
- shadcn 설정: `components.json` (style: `radix-nova`, iconLibrary: `lucide`)
- `lang="ko"` 고정 (`layout.tsx`)
