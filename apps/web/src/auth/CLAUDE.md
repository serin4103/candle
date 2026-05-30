# auth — 로그인 세션 (PRD-S6)

> 제품 요구사항(기능 ID 정의)은 루트 [CLAUDE.md](../../../../CLAUDE.md)의 **PRD** 섹션 참조.

Google 로그인(Supabase Auth) 세션을 다루는 프론트 흐름. 로그인은 **선택**이며,
저장(PRD-M5)·마이페이지(PRD-S6)에만 필요하다. 편집·3D·열람 링크 열기는 비로그인으로 가능.

## 담는 것
- Supabase 클라이언트(anon 키)와 세션 훅: 현재 사용자·`signInWithGoogle`·`signOut`
- **로그인/로그아웃 팝업 UI**: 로그인 다이얼로그(Google로 계속하기)·로그인 상태의 사용자 메뉴(드롭다운, 로그아웃)
- 세션 access token을 `api` 호출의 `Authorization` 헤더에 실어 보내는 보조

## 규칙
- **상단바의 트리거 버튼(로그인/로그아웃 버튼·아바타) 배치는 App 셸(`apps/web/src/App.tsx`)이 맡는다.** 여기는 그 버튼이 여는 팝업과 세션을 제공한다(셸이 헤더에 `auth/`의 팝업 컴포넌트를 배치·연결).
- 토큰 검증·소유권 판단은 백엔드 `apps/api/src/auth`가 한다. 여기는 세션 보유·표현·헤더 부착만.
- 디자인 문서 상태는 `document/store`가 소유한다. 여기 상태는 세션(사용자·토큰) 표현용.
- 비밀키·OAuth 설정은 환경변수(`VITE_SUPABASE_URL`·`VITE_SUPABASE_ANON_KEY`)로, 코드에 하드코딩 금지.
