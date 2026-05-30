# auth — 인증·소유권 토대 (PRD-S6)

> 제품 요구사항(기능 ID 정의)은 루트 [CLAUDE.md](../../../../CLAUDE.md)의 **PRD** 섹션 참조.

Supabase Auth(Google OAuth)가 발급한 토큰을 검증해 요청 주체(`userId`)를 식별한다.
**편집 접근 제어의 토대** — `designs`의 소유권(`ownerId`) 검증이 이 `userId`에 기댄다.

## 담는 것
- JWT 검증 미들웨어: `Authorization: Bearer` 토큰 검증 → 요청에 `userId`(JWT `sub`) 주입
- 인증 가드: 저장·수정·목록·복제 라우트에 적용(토큰 없음/무효 → 401)
- 비인증 허용 경로 구분: 열람(`by-view`)·열람 로드는 로그인 불필요

## 규칙
- 라우트·도메인(`designs`)에는 `userId`만 넘긴다 — 인증 세부(토큰·검증)는 여기에 격리(레이어 경계).
- 열람 공유는 인증이 아니라 `share/`의 `viewToken`이 담당. 편집은 소유권, 열람은 토큰으로 축을 분리.
- 검증 시크릿·키는 환경변수로, 코드에 하드코딩 금지.
