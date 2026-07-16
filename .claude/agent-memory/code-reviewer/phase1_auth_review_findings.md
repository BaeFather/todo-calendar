---
name: phase1-auth-review-findings
description: Phase 1(인증) 코드 리뷰(2026-07-16)에서 발견된 미해결 이슈 목록 — 다음 리뷰나 Phase 2 작업 시 재확인 필요
metadata:
  type: project
---

2026-07-16에 Phase 1(더미 로그인/회원가입 → 실제 Supabase Auth 연동) 코드 리뷰를 수행하고 아래 이슈들을 발견함. 아직 수정 여부는 확인되지 않았으므로, 관련 파일을 다시 작업하게 되면 고쳐졌는지 먼저 확인할 것.

1. **`src/components/layout/site-header.tsx` 모바일 네비 회귀 버그**: `displayName` 유무로 분기하면서 로그인 상태일 때 모바일(`md` 미만)에서 `Sheet`(햄버거 메뉴, `NavLinks` 포함) 전체가 사라지고 `UserNav`로 완전히 대체됨. 즉 로그인한 사용자는 모바일에서 사이트 내비게이션 링크(`siteConfig.nav`)에 접근할 방법이 없음. 현재는 `nav`가 "홈" 하나뿐이라 체감 영향이 작지만, Phase 2 이후 캘린더/기타 nav 항목이 추가되면 로그인 사용자만 이동 불가능해짐. 커밋 전 diff 확인 결과 로그인 전에는 항상 Sheet가 떠 있었던 걸 이번에 조건부로 바꾸면서 생긴 회귀. 수정 방향: `UserNav`는 Sheet 트리거 옆에 별도로 두거나 Sheet 내부에 포함시켜, 로그인 여부와 무관하게 모바일 네비 접근성을 유지해야 함.

2. **`src/components/layout/site-header.tsx`의 `onAuthStateChange` 이벤트 필터링 없음**: 구독 콜백이 이벤트 종류를 가리지 않고 항상 `router.refresh()`를 호출함. `INITIAL_SESSION`(마운트 시 최초 1회), `TOKEN_REFRESHED`(주기적, 보통 1시간마다), `USER_UPDATED` 등에도 불필요한 서버 컴포넌트 리페치가 발생. 무한루프는 아니지만(리프레시 자체가 새 auth 이벤트를 만들지 않음) 낭비성 리렌더링/깜빡임 유발 가능. `SIGNED_IN` / `SIGNED_OUT`일 때만 `router.refresh()` 하도록 이벤트 필터링 권장.

3. **`src/components/auth/signup-form.tsx`가 `data.session` 미확인**: `signUp` 응답에서 `error`만 구조분해하고 `data`는 무시함. Supabase 프로젝트의 "Confirm email" 설정이 꺼져 있으면 `signUp` 직후 세션이 바로 생성되는데, 이 경우에도 무조건 "인증 메일을 발송했습니다" 토스트만 띄우고 `form.reset()`만 함 — 실제로는 이미 로그인된 상태인데 UI가 이를 반영 못함. `data.session` 존재 여부로 분기해 로그인 상태면 `router.push("/") + router.refresh()`를 호출하도록 보완 필요.

4. **로그인/회원가입 폼의 `error.message` 원문 노출**: `login-form.tsx`/`signup-form.tsx` 둘 다 `toast.error(error.message)`로 Supabase 에러 메시지를 그대로 노출. 로그인 실패 메시지("Invalid login credentials")는 Supabase가 의도적으로 일반화한 문구라 문제 없지만, 회원가입 시 이미 가입된(확인 완료) 이메일로 재가입을 시도하면 "User already registered" 같은 메시지가 그대로 노출되어 이메일 존재 여부를 추측할 수 있는 계정 열거(enumeration) 여지가 있음. `src/app/auth/callback/route.ts`는 반대로 일반화된 한국어 메시지("인증에 실패했습니다...")를 쓰는 좋은 패턴이므로, 폼 쪽도 회원가입 실패 메시지는 일반화된 문구로 통일하는 걸 검토.

**검증된 안전한 패턴** (재확인 불필요):
- `auth/callback/route.ts`의 `next` 쿼리 파라미터는 `${origin}${next}` 형태로 origin을 항상 prefix하므로 `//evil.com`, `https://evil.com` 등을 넣어도 host가 바뀌지 않아 open redirect 위험 없음(직접 검증 완료).
- `layout.tsx`가 `getSession()`이 아닌 `getUser()`로 서버 검증하는 점, `profiles` RLS(`select` 공개, `update`는 본인만)와 `handle_new_user` 트리거(`security definer set search_path=public`)는 올바르게 하드닝되어 있음.
- `src/proxy.ts`가 신 컨벤션(`export function proxy`)을 올바르게 따름.
