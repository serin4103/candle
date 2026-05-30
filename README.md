# 🎂 candle

> 케이크를 자유롭게 디자인하고, **3D 시안**을 확인할 수 있는 웹 애플리케이션

사용자는 전개도(펼친 도면) 위에서 케이크를 꾸미고, 그 결과를 즉시 3D로 돌려 보며 완성 모습을 확인한 뒤, 링크 하나로 공유합니다.
로그인하면 디자인을 내 계정에 저장해 마이페이지에서 모아 관리할 수 있습니다.

- **목표** — 비전문가도 5분 안에 만족스러운 케이크 시안을 완성하고, 디자인 의도를 3D 시안으로 정확히 전달한다.
- **대상** — 케이크 디자인 시안을 직접 만들고 싶은 사람. 만든 시안은 링크로 누구에게나 전달할 수 있습니다.

---

## ✨ 핵심 사용자 흐름

1. **시트 선택** — 원형·사각형·하트 등 시트 모양과 크림(표면) 색상을 고른다.
2. **전개도 디자인** — 펼친 도면 위에 2D 요소(일러스트·레터링·파이핑)와 업로드 이미지를 배치하거나 손그림으로 꾸민다.
3. **3D 확인** — 3D 뷰로 전환하면 디자인이 동기화되어 입체로 돌려 보며 점검한다.
4. **저장 & 링크 공유** — 디자인을 서버에 저장하면 편집 링크·열람 링크가 발급된다. 받는 사람은 로그인 없이 열람·복제할 수 있다.

---

## 주요 기능

### 🍰 케이크 만들기
- **시트 모양 선택** — 원형·사각형·하트 중 골라 기본 틀을 잡습니다.
- **크림 색상 선택** — 팔레트·컬러 피커로 표면 베이스 색을 고르면 전개도와 3D에 즉시 반영됩니다.

### 🎨 전개도 디자인
- **요소 배치** — 일러스트·레터링·이미지를 올리고 이동·크기조절·회전·삭제·레이어 순서 변경. 레터링은 텍스트·폰트·색상을 바꿀 수 있습니다.
- **파이핑** — 모양(원형·스캘럽·물방울)·굵기(0.2~2.0cm)·색상을 지정해 곡선 경로를 따라 펜처럼 그립니다.
- **손그림** — 펜으로 자유 손그림을 그리고, 브러시 굵기·색상 조절과 획 단위 지우개를 지원합니다.
- **이미지 업로드** — PNG·JPG·SVG를 올려 크기와 위치를 자유롭게 조정합니다.
- **되돌리기 / 다시 실행** — `Ctrl/Cmd+Z`·`Ctrl/Cmd+Shift+Z`로 직전 편집을 되돌리고 다시 실행합니다. 드래그 이동 같은 연속 동작은 한 번에 되돌려집니다.

### 🔄 3D 확인
- **즉시 동기화** — 전개도를 텍스처로 구워 케이크 메시에 입힙니다.
- **360° 확인** — 회전·확대축소로 완성 모습을 점검합니다. 3D 뷰는 읽기 전용입니다.

### 🔗 저장 & 공유
- **Google 로그인 & 마이페이지** — 로그인하면 디자인을 내 계정에 저장해 고유 URL(`/d/:id`)을 갖고, 소유자만 수정할 수 있습니다. 마이페이지에서 저장한 디자인을 윗면 썸네일과 함께 모아 보고 편집을 이어갑니다.
- **링크 공유** — 3D 시안 공유 링크를 생성할 수 있습니다. 공유 링크에는 로그인 없이도 접근할 수 있습니다.

---

## 🏛 아키텍처 원칙

> **단일 디자인 문서(Single Source of Truth)** — 전개도와 3D는 같은 데이터에서 나오는 두 개의 *렌더링 결과*다.

- 모든 디자인은 **전개도(UV) 좌표계** 기준의 요소 리스트로 `document/store`에 보관한다.
- 2D 전개도 에디터는 이 문서를 직접 편집하고, 3D 뷰는 전개도를 텍스처로 구워 케이크 메시에 입힌다.
- 따라서 전개도↔3D "동기화"는 별도 변환이 아니라 *같은 문서를 다시 렌더링하는 것*이다.

### MVVM 규율
- **View** — 렌더링·입력 위임만. 계산하지 않는다. (`canvas`, `meshes`, `panels`, `ui`)
- **ViewModel** — 표현 로직·명령·계산. 렌더링 기술을 import하지 않는다. (`tools`, `store`의 액션)
- **Model** — 순수 데이터·도메인 규칙. UI를 모른다. (`schema`, `geometry`, `store`의 상태)

단방향 흐름: 포인터 이벤트는 View가 받고 → 계산은 ViewModel이 하고 → 결과는 Model(`store`)에만 쓰고 → 갱신은 구독으로 모든 View에 퍼진다.

---

## 🛠 기술 스택

| 영역 | 사용 기술 |
| --- | --- |
| **모노레포** | pnpm workspace, TypeScript 5.7, Node ≥ 22 |
| **프론트엔드** (`apps/web`) | React 18, Vite 6, Zustand(상태), Three.js · @react-three/fiber · @react-three/drei(3D) |
| **백엔드** (`apps/api`) | Fastify 5, `@fastify/cors`, `@fastify/multipart`, tsx |
| **공용 패키지** (`packages/shared`) | Zod(스키마·검증), 전개도/UV 기하 순수 함수 |
| **인증 · 저장** | Supabase (Auth: Google OAuth · DB · Storage) |
| **테스트 · 품질** | Vitest, ESLint, Prettier |

### 디렉토리 구조
```
candle/
├── packages/shared/      프론트·백엔드 공용 Model (schema/, geometry/)
└── apps/
    ├── web/              에디터 + 뷰어 + 공유 페이지
    │   └── src/
    │       ├── document/   디자인 문서 (store/, history/)
    │       ├── editor2d/    전개도 뷰 (canvas/ tools/ elements/ panels/)
    │       ├── viewer3d/    3D 뷰 (meshes/ texture/ decorations/ controls/)
    │       ├── cake/ auth/ mypage/ share/ api/ ui/
    └── api/              저장 + 링크 + 업로드
        └── src/            auth/ designs/ share/ assets/ infra/
```

### 개발 명령
```bash
pnpm install          # 의존성 설치
pnpm dev              # web + api 동시 실행
pnpm dev:web          # 프론트엔드만
pnpm dev:api          # 백엔드만
pnpm typecheck        # 전체 타입 체크
pnpm test             # 전체 테스트 (Vitest)
pnpm lint             # ESLint
pnpm format           # Prettier
pnpm build            # 전체 빌드
```

---

## 🤖 에이전틱 워크플로우 (Claude Code 스킬)

 `PRD → 계획 문서 → phase별 구현`의 흐름을 **두 개의 커스텀 스킬**(`.claude/skills/`)로 일관되게 강제합니다. PRD(`CLAUDE.md`)가 "무엇(what)"을 정의하면, 스킬이 "어떻게·어떤 순서·어떤 완료 기준(how/order/contract)"을 채워 실행합니다.

```
CLAUDE.md (PRD, SSOT)
        │
        ▼  [plan-author]  ── 기능 그룹/요구사항을 phase별 실행 계획 문서로 작성
docs/PLAN-<GROUP>.md
        │
        ▼  [phase-runner] ── 한 phase를 계획→구현→검증→체크박스→커밋 한 사이클로 닫음
구현된 코드 + 갱신된 체크박스 + 커밋
```

### 📝 `plan-author` — 계획 문서 작성 전용
PRD의 기능 그룹(예: Should/Could)이나 임의의 요구사항을 입력받아 **phase별 실행 계획 문서**를 `docs/PLAN-<GROUP>.md`로 생성합니다.

- 목표 · 작업/산출물 테이블 · **완료 기준 체크박스** · 의존 그래프 · 교차 검증 · 범위 밖 섹션을 일관된 골격으로 작성
- 토대(데이터·스키마·좌표)를 먼저, UI·통합을 나중에 배치하고 **리스크는 앞 phase에서 PoC로 선검증**
- 출력은 항상 `phase-runner`가 곧바로 소비할 수 있는 형식 (`## Phase N — ...` 헤더, `- [ ]` 체크박스)
- 산출물 예: [`docs/PLAN-MUST.md`](./docs/PLAN-MUST.md), [`docs/PLAN-SHOULD.md`](./docs/PLAN-SHOULD.md), [`docs/PLAN-UNDO-REDO.md`](./docs/PLAN-UNDO-REDO.md)

> 호출 예: *"Should 기능 구현 계획 짜줘"*, *"이 요구사항을 phase로 쪼개서 실행 계획 문서로"*

### 🚀 `phase-runner` — 한 phase를 끝까지 완료
계획 문서의 특정 phase를 입력받아 **한 사이클로 닫습니다**:

1. **대상 phase 읽기** — 목표·완료 기준 파악, 선행 phase 완료 여부·`CLAUDE.md` 규약 확인
2. **상세 실행 plan 생성** — `docs/<theme>-phase-<N>-plan.md`에 작업 항목(W1, W2…)·의존성·**병렬 실행 그룹(wave)** 분해
3. **구현** — MVVM 규율과 폴더 역할을 지켜 코드 작성
4. **검증** — 완료 기준을 하나씩 증거로 확인 (이 스킬의 핵심 가치)
5. **체크박스 갱신** — 마스터 문서의 `- [ ]`를 검증된 것만 `- [x]`로
6. **커밋**

> 호출 예: *"phase 1 진행"*, *"PLAN의 다음 phase 구현"*, *"다음 단계 해줘"*

두 스킬은 역할이 분리되어 있습니다 — `plan-author`는 **문서를 쓰고**, `phase-runner`는 **그 문서의 한 phase를 실행**합니다.
