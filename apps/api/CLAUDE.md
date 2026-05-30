# api — 백엔드

> 제품 요구사항(기능 ID 정의)은 루트 [CLAUDE.md](../../CLAUDE.md)의 **PRD** 섹션 참조.

디자인 저장, 열람 링크 발급, 이미지 업로드를 담당. 로그인은 Supabase Auth(Google)에 위임하며(PRD-S6), 편집 접근은 소유권(`ownerId`), 열람 공유는 `share/`의 view 토큰이 제어한다. 비로그인도 편집·열람은 가능하고 저장만 로그인 필요.

## 하위 폴더
- `auth/` — Supabase Auth 토큰 검증·`userId` 주입 (PRD-S6)
- `designs/` — 디자인 문서 CRUD·저장, 소유권 (PRD-M5, PRD-S6)
- `share/` — 열람(view) 토큰 발급·검증 (PRD-M5, PRD-C4)
- `assets/` — 이미지 업로드·스토리지 (PRD-S4)
- `infra/` — DB·오브젝트 스토리지 연동

## 규칙
- 요청/응답·문서 타입은 `packages/shared/schema` 재사용.
- 인증 세부(토큰 검증)는 `auth/`에 격리 — 도메인(`designs`)은 `userId`만 받는다.
