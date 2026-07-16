---
name: phase1-auth-review-findings
description: Phase 1(인증) 코드 리뷰(2026-07-16)에서 발견된 미해결 이슈 목록 — 다음 리뷰나 Phase 2 작업 시 재확인 필요
metadata:
  type: project
---

2026-07-16에 Phase 1(더미 로그인/회원가입 → 실제 Supabase Auth 연동) 코드 리뷰를 수행하고 아래 이슈들을 발견함. 1번(반드시 수정)과 2~4번(개선 권장사항)은 모두 2026-07-16에 수정 완료됨. 아래는 당시 발견 내용 + 실제 적용된 수정 내용 기록.

1. **[수정완료] `src/components/layout/site-header.tsx` 모바일 네비 회귀 버그**: `displayName` 유무로 분기하면서 로그인 상태일 때 모바일(`md` 미만)에서 `Sheet`(햄버거 메뉴, `NavLinks` 포함) 전체가 사라지고 `UserNav`로 완전히 대체됨. 수정: `UserNav`를 Sheet 트리거 옆에 나란히 렌더링(`{displayName && <UserNav .../>}`)하고, `Sheet`/`NavLinks`는 로그인 여부와 무관하게 항상 렌더링, "로그인" 버튼만 `{!displayName && ...}`으로 조건부 처리.

2. **[수정완료] `site-header.tsx`의 `onAuthStateChange` 이벤트 필터링 없음**: 모든 이벤트에 무조건 `router.refresh()` 호출하던 것을, `event === "SIGNED_IN" || event === "SIGNED_OUT"`일 때만 호출하도록 필터링함.

3. **[수정완료] `signup-form.tsx`가 `data.session` 미확인**: `signUp` 응답에서 `data`도 구조분해하도록 변경, `data.session`이 존재하면(Confirm email 꺼져있어 즉시 로그인된 경우) 성공 토스트 후 `router.push("/") + router.refresh()` 호출. 세션이 없으면(이메일 인증 필요) 기존대로 "인증 메일을 발송했습니다" 토스트 + `form.reset()`.

4. **[수정완료] 로그인/회원가입 폼의 `error.message` 원문 노출**: `login-form.tsx`는 "이메일 또는 비밀번호가 올바르지 않습니다."로 일반화. `signup-form.tsx`는 "회원가입에 실패했습니다. 입력하신 정보를 다시 확인해주세요."로 일반화하여 "User already registered" 등 계정 존재 여부를 드러내는 원문 노출을 제거함.

**검증된 안전한 패턴** (재확인 불필요):
- `auth/callback/route.ts`의 `next` 쿼리 파라미터는 `${origin}${next}` 형태로 origin을 항상 prefix하므로 `//evil.com`, `https://evil.com` 등을 넣어도 host가 바뀌지 않아 open redirect 위험 없음(직접 검증 완료).
- `layout.tsx`가 `getSession()`이 아닌 `getUser()`로 서버 검증하는 점, `profiles` RLS(`select` 공개, `update`는 본인만)와 `handle_new_user` 트리거(`security definer set search_path=public`)는 올바르게 하드닝되어 있음.
- `src/proxy.ts`가 신 컨벤션(`export function proxy`)을 올바르게 따름.
