# Must Phase 5 실행 계획 — PRD-M5 서버 저장 & 링크 공유 (비로그인)

> 소스: [docs/PLAN-MUST.md](./PLAN-MUST.md) Phase 5 · 생성일: 2026-05-29
> 아키텍처·폴더 역할은 루트 [CLAUDE.md](../CLAUDE.md) 단일 출처를 따른다.

## 목표

서버 저장 후 로그인·설치 없이 열리는 **편집 링크**(작성자 수정)·**열람 링크**(비로그인 열람·복제)를 발급한다. 두 링크는 서로 다른 고유 URL이며, 문서 형식은 `packages/shared/schema`로 검증한다.

## 전제 / 의존 phase 확인

- Phase 1(`shared/schema`·`store`) 완료 — `Design`/`ShareLink`/`validateDesign`·`getDesignSnapshot`/`loadDesign` 존재 확인됨.
- Phase 5는 PLAN-MUST 6장에 따라 Phase 1 이후 2~4와 병렬 가능. Phase 2~4도 완료된 상태(체크박스 채워짐).
- DB는 미구축 → `infra/`는 **인메모리 어댑터**로 시작(인터페이스로 감싸 도메인이 세부를 모름). 실제 DB는 범위 밖(Phase 0 전제: 정의 단계).

## 작업 항목

- [x] W1 (api/infra) 인메모리 저장소 어댑터 — `DesignRepository` 인터페이스 + `createInMemoryRepository()` (designs·editTokens·viewTokens 맵). — depends-on: 없음
- [x] W2 (api/share) 토큰 발급 — `generateToken()`(추측불가, crypto) + `issueShareLink(designId)` → 서로 다른 `editToken`·`viewToken`. — depends-on: 없음
- [x] W3 (api/designs) 도메인 서비스 — `create`/`getByEdit`/`getByView`/`updateByEdit`/`cloneByView`. 저장·로드 경계에서 `validateDesign`. 서버가 `id` 부여(클론 독립성). 열람 토큰은 view 맵으로만 해석 → 원본 수정 불가. — depends-on: W1, W2
- [x] W4 (api/routes + index) 라우트 등록 — `POST /designs`, `GET /designs/by-edit/:editToken`, `GET /designs/by-view/:viewToken`, `PUT /designs/by-edit/:editToken`, `POST /designs/by-view/:viewToken/clone`. NotFound→404, 검증실패→400. — depends-on: W3
- [x] W5 (api/test) 도메인 서비스 단위 테스트 — 저장→edit/view 로드, edit 수정, view 클론(독립), 두 토큰 상이, view 토큰으로 edit 불가. — depends-on: W3
- [x] W6 (web/api) 백엔드 호출 클라이언트 — `saveDesign`/`loadByEdit`/`loadByView`/`updateByEdit`/`cloneByView`. 스키마 타입 재사용, 호출·직렬화만. Vite `/api` 프록시. — depends-on: W4(계약)
- [x] W7 (web/share) 진입·공유 흐름 — 경로 파싱(`/`·`/edit/:t`·`/view/:t`), 저장 후 두 URL 노출 패널, 편집 링크 진입(작성자 수정), 열람 링크 진입(읽기전용) + 복제 후 수정. — depends-on: W6
- [x] W8 (web/App) App 통합 — 헤더에 저장/공유, 라우트별 모드(new/edit/view) 분기, 열람 모드는 읽기전용+복제 버튼. — depends-on: W7

## 실행 계획 (병렬성)

- **Wave 1 (병렬 가능):** W1, W2 — 서로 다른 폴더(`infra`/`share`), 공유 상태 없음.
- **Wave 2 (순차):** W3 — W1 저장소·W2 토큰을 소비.
- **Wave 3 (병렬 가능):** W4, W5 — 둘 다 W3 의존, 서로 다른 파일(라우트 wiring vs 테스트), 충돌 없음.
- **Wave 4 (순차):** W6 — W4 라우트 계약에 의존.
- **Wave 5 (순차):** W7 — W6 클라이언트 소비.
- **Wave 6 (순차):** W8 — W7 컴포넌트 통합.

> 백엔드(W1~W5)와 프론트(W6~W8)는 라우트 계약(W4)으로만 연결 — 계약 확정 후 프론트는 독립.

## 완료 기준 (PLAN-MUST Phase 5)

- [x] 서버 저장 동작. — service test + curl + 브라우저 저장
- [x] 편집 링크로 작성자가 수정 가능. — `PUT /by-edit` + service test
- [x] 열람 링크로 비로그인 열람·복제 후 수정 가능. — `by-view`·clone + service test(독립성)
- [x] 편집/열람 링크가 서로 다른 고유 URL. — crypto 난수 2개, service test + 브라우저 확인

## 검증 전략

1. 정적: `pnpm -r typecheck`, `pnpm -r build`, `pnpm -r test`, `pnpm lint`.
2. 단위(W5): 도메인 서비스로 4개 완료 기준을 직접 증명.
3. 런타임 스모크: api 기동 후 curl 왕복(save→edit-load→edit-update→view-load→view-clone). 두 토큰 상이·열람토큰 edit거부 확인. 프론트 UI는 build/typecheck로 존재 확인 + 수동 확인 항목 보고.
