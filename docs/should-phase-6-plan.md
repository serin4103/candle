# Should Phase 6 실행 계획 — PRD-S6 로그인 & 소유권 저장 & 마이페이지

> 소스: [docs/PLAN-SHOULD.md](PLAN-SHOULD.md) Phase 6 · phase: 6 · 생성일: 2026-05-30
> 루트 [CLAUDE.md](../CLAUDE.md) PRD-S6 단일 출처. 본 문서는 구현 작업 단위 체크리스트.

## 목표
Google 로그인(Supabase Auth)으로 작성자를 식별하고 디자인을 **소유자(ownerId)** 에 귀속해 저장한다. 저장 시 편집 URL이 `/d/:id`가 되고 마이페이지에서 저장 디자인을 다시 연다. **편집 링크(editToken) 제거 → 소유권 대체**, **열람 링크(viewToken)·복제 유지**.

## 설계 결정
- 인증: Supabase Auth + Google OAuth. 백엔드는 토큰 검증만(소유권 판단의 토대).
- 토큰 검증은 `AuthVerifier` 인터페이스로 격리 — 프로덕션은 `supabase.auth.getUser`, 로컬/테스트는 주입형 가짜(`x-dev-user-id` 헤더). 네트워크·실키 없이 단위·라우트 테스트 가능.
- 소유권은 **Design 문서가 아니라 DB 메타**(designs.owner_id). `Design` 스키마 불변.
- `ShareLink`에서 `editToken` 제거 → `{ designId, viewToken }`.

## 작업 항목
- [x] W0 (web deps) `apps/web/package.json`에 `@supabase/supabase-js` 추가 + install — depends-on: 없음
- [x] W1 (schema) `packages/shared/schema`: `ShareLink`에서 `editToken` 제거 → `{ designId, viewToken }` — depends-on: 없음
- [x] W2 (api/auth) `apps/api/src/auth/`: `AuthVerifier`(supabase/dev) + Fastify 플러그인(req.userId 주입) + `requireUser` + `UnauthorizedError`/`ForbiddenError` + 테스트 — depends-on: 없음
- [x] W3 (infra) `apps/api/src/infra/repository.ts`·`supabase.ts`: `saveDesign(design, ownerId)`·`getOwner`·`listDesignsByOwner`, view-only 토큰/`getShareLink` — depends-on: W1
- [x] W4 (sql) `docs/supabase-schema.sql`: `designs.owner_id` 컬럼 + 마이그레이션 주석 — depends-on: 없음
- [x] W5 (designs) `apps/api/src/designs/service.ts`·`index.ts`: 소유권 서비스(create(input,ownerId)/getById/updateById/listMine/getByView/cloneByView(token,userId)), editToken 경로 제거, 테스트 재작성 — depends-on: W1, W3
- [x] W6 (routes) `apps/api/src/routes.ts`·`index.ts`: 인증 가드 + 신규 라우트(POST/GET /designs, GET/PUT /designs/:id, by-view 유지) + 401/403 매핑 + 라우트 테스트 — depends-on: W2, W5
- [x] W7 (web auth) `apps/web/src/auth/`: `supabaseClient`·`useAuthSession`·`LoginDialog`·`UserMenu`·`index` — depends-on: W0
- [x] W8 (api client) `apps/web/src/api/client.ts`·`index.ts`: 토큰 부착(`setAuthToken`), `listMyDesigns`/`loadById`/`updateById`, `saveDesign` 반환 갱신, edit 경로 제거 — depends-on: W1
- [x] W9 (share) `apps/web/src/share/route.ts`·`useShareSession.ts`·`SharePanel.tsx`: `/d/:id`·`/mypage` 파싱, 디자인-id 흐름, 저장은 로그인 필요 — depends-on: W7, W8
- [x] W10 (mypage) `apps/web/src/mypage/`: 저장 목록 페이지 → 선택 시 `/d/:id` 이동 — depends-on: W7, W8
- [x] W11 (App 셸) `apps/web/src/App.tsx`: 상단바 로그인/로그아웃·저장·마이페이지 버튼 배치·연결, `/mypage` 라우팅 — depends-on: W7, W9, W10

## 실행 계획 (병렬성)
- **Wave 1 (병렬):** W0, W1, W2, W4 — 서로 다른 파일·폴더, 공유 상태 없음
- **Wave 2 (병렬):** W3(←W1), W7(←W0), W8(←W1) — 각각 infra / web-auth / web-api로 분리
- **Wave 3:** W5(←W1,W3)
- **Wave 4 (병렬):** W6(←W2,W5), W9(←W7,W8), W10(←W7,W8)
- **Wave 5:** W11(←W7,W9,W10)

> 인라인 구현이므로 의존 순서대로 진행하되, 같은 wave의 독립 파일은 한 응답에서 함께 편집한다.

## 검증
- 정적: `pnpm -r typecheck` · `pnpm -r build` · `pnpm -r test` · `pnpm lint`
- 단위: designs 서비스(소유자 일치/불일치 403·내 목록·복제 소유권), auth 가드(토큰 없음 401), schema(viewToken-only)
- 라우트: Fastify inject로 401/403/소유권 왕복
- 런타임 스모크: api 서버 + 가짜 검증(`x-dev-user-id`)으로 저장→소유자 수정→타인 403→by-view 열람·복제 curl. web 빌드.
- **수동 확인 필요(자동 불가):** 실제 Google OAuth 로그인(Supabase·Google 콘솔 설정 + 실 브라우저). 6.0 체크리스트 참조.

## 범위 밖
- 6.0 인프라 설정(Google/Supabase 콘솔, env)은 코드가 아니라 운영 작업 — 문서로만.
- 기존 editToken 데이터 백필(MVP 데이터 적음 — 재설정).
