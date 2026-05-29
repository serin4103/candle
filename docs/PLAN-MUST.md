# Must 기능 구현 계획 (PRD-M1 ~ PRD-M5)

> 본 문서는 [CLAUDE.md](../CLAUDE.md)의 PRD를 단일 출처로 삼아 **MVP 필수(Must)** 기능을 구현하기 위한 실행 계획이다.
> 기능 ID·아키텍처·폴더 역할의 정의는 항상 루트 CLAUDE.md를 따른다. 본 문서는 *어떻게(how)* 와 *순서·계약·완료 기준* 을 다룬다.

## 0. 현재 상태와 전제

- 레포는 **정의 단계**다. 폴더별 `CLAUDE.md`만 존재하고 소스 코드·빌드 도구(`package.json`, `tsconfig.json`)는 없다.
- 따라서 Must 구현은 **Phase 0(부트스트랩)** 부터 시작한다.
- 언어/스택은 PRD 규약에서 도출: **TypeScript 모노레포**, 상태관리 **Zustand**, 3D **Three.js + React Three Fiber(R3F)**, 스키마 검증 **zod**, 프론트 **React + Vite**, 백엔드 **Node(예: Fastify/Express) + 오브젝트 스토리지**.

## 1. 아키텍처 불변식 (모든 Phase에서 강제)

CLAUDE.md의 MVVM 규율을 구현 내내 지킨다. PR 리뷰 체크리스트로도 사용한다.

1. **단일 디자인 문서**: 전개도·3D는 `document/store`의 같은 `Design`을 렌더링한 두 결과다. 동기화 = 재렌더링이지 변환이 아니다.
2. **좌표 단일화**: 모든 요소 좌표는 **전개도(UV) 좌표계**로 저장한다. 픽셀↔전개도 변환·회전 역변환은 전부 `packages/shared/geometry`의 순수 함수로만 한다.
3. **레이어 경계**:
   - View(`canvas`, `meshes`, `panels`, `ui`)는 **계산 금지**. 포인터 이벤트를 ViewModel에 위임만.
   - ViewModel(`tools`, `store` 액션, `texture`)은 **렌더 기술 import 금지**(Canvas/R3F/Three 미import).
   - Model(`schema`, `geometry`, `store` 상태)은 **UI를 모른다.**
4. **단방향 흐름**: View 이벤트 → ViewModel 계산 → `store`(Model)에 기록 → 구독으로 모든 View 갱신.

> 위반 시 리뷰에서 반려. 특히 `tools`/`texture`에서 좌표 계산을 인라인으로 하지 말고 `geometry`로 내린다.

---

## Phase 0 — 부트스트랩 (뼈대)

**목표**: 빌드·타입·실행 가능한 모노레포 골격.

| 작업 | 산출물 |
|---|---|
| 모노레포 설정 | 루트 `package.json`(workspaces: `apps/*`, `packages/*`), `pnpm-workspace.yaml`(또는 npm/yarn), 공용 `tsconfig.base.json` |
| 프론트 앱 | `apps/web` — Vite + React + TS, `apps/web/src/main.tsx`, 라우팅 골격 |
| 백엔드 앱 | `apps/api` — Node + TS 서버 부트, 헬스체크 라우트 |
| 공용 패키지 | `packages/shared` — 빌드 타깃, `schema`·`geometry` export 엔트리 |
| 품질 도구 | ESLint(레이어 경계 규칙: `tools`/`texture`에서 three/r3f import 금지 룰 고려), Prettier, 기본 vitest |

**완료 기준**:
- [x] `web` 빈 화면이 뜬다 (Vite+React 빌드·렌더 확인).
- [x] `api` 헬스체크가 응답한다 (`GET /health` → `{"status":"ok"}`).
- [x] `shared`를 두 앱이 import할 수 있다 (워크스페이스 의존성 연결, 전체 typecheck 통과).
- [x] 레이어 경계 린트가 동작한다 (ViewModel/Model의 three import를 에러로 검출).

---

## Phase 1 — Model 토대: `shared/schema` + `shared/geometry` + `document/store`

> CLAUDE.md 구현 순서 1번. **가장 먼저, 가장 위험한 부분(geometry)을 검증**한다.

### 1.1 `packages/shared/schema`
zod로 타입 + 검증 정의. (Decoration3D/Asset은 Must에 직접 쓰이지 않지만 문서 형식 단일성을 위해 타입만 선언)

- `Design`: `id`, `shape`('circle'|'square'|'heart'), `baseColor`(시트색), `creamColor`, `spec`({ size(호수), height, layers(단) }), `elements: Element[]`, `decorations3d: Decoration3D[]`
- `Element`: `id`, `type`('illustration'|'lettering'|'piping'|'drawing'|'image'), `transform`({ x, y, scale, rotation }) **— x,y는 전개도 좌표**, `zIndex`, 타입별 payload(레터링: text/font/color 등)
- `ShareLink`: `designId`, `editToken`, `viewToken`
- (선언만) `Decoration3D`, `Asset`
- `validateDesign(input): Design` 등 검증 함수. **로직 없이 타입+검증만.**

### 1.2 `packages/shared/geometry` (최우선 PoC)
순수 함수. View/ViewModel 양쪽이 공유.

- `getNet(shape, spec)` → 전개도 정의(옆면 펼친 사각형 + 윗면 영역의 크기·배치)
- `uvForNetPoint(shape, spec, point)` → 전개도 점 → 메시 UV
- `screenToNet(viewport, point)` / `netToScreen(...)` → 픽셀↔전개도(팬/줌 포함)
- `applyInverseRotation(transform, point)` → 회전 요소 로컬 좌표(M3 핸들/히트테스트용, S2 대비)
- `recomputeForSpec(spec)` → 규격 변경 시 전개도·UV 재계산(M4/S5 대비, Must에선 기본 spec 고정 가능)

> **리스크 PoC**: 원형(실린더)·사각(박스)은 직관적. **하트 압출 전개도↔UV 매핑을 먼저 검증**한다(작은 테스트 + 시각 확인). 여기서 막히면 Must M1의 하트는 후순위로 내리고 원형/사각 2종으로 먼저 출시 가능성을 보고한다.

### 1.3 `apps/web/src/document/store` (진실의 원천)
Zustand 스토어. **액션은 geometry만 호출, 렌더 기술 미import.**

- 상태: 현재 `Design`, 선택 상태(selectedId), 뷰포트(팬/줌)
- 액션(Must 범위): `setShape`, `setBaseColor`/`setCreamColor`, `addElement`, `moveElement`, `scaleElement`, `rotateElement`, `deleteElement`, `reorderElement`(zIndex), `updateLettering`(text/font/color), `loadDesign`, `getDesignSnapshot`

**완료 기준**:
- [ ] 스토어 액션 단위 테스트 통과.
- [ ] geometry 변환 함수 테스트 통과(하트 포함 또는 리스크 보고).

---

## Phase 2 — PRD-M1 / PRD-M2: 시트 모양·색상 선택 (`cake`)

**의존**: Phase 1.

- `cake/` 모양 선택 UI: 최소 3종(원형/사각형/하트) → `store.setShape` → `geometry.getNet` 재계산
- `cake/` 색상 선택 UI: 시트/크림 베이스 팔레트 + 컬러 피커(`ui`의 공통 컴포넌트) → `store.setBaseColor`/`setCreamColor`
- 선택 결과가 전개도 뷰(및 이후 3D)에 반영되도록 store 구독.

**완료 기준 (PRD-M1, M2 수용 기준)**:
- [ ] 3종 모양 선택 가능, 선택 시 전개도 뷰가 해당 모양에 맞게 구성된다.
- [ ] 팔레트/피커로 고른 색이 전개도에 즉시 반영된다(3D 반영은 Phase 4에서 검증).

---

## Phase 3 — PRD-M3: 전개도 2D 요소 배치 (`editor2d`)

**의존**: Phase 1, 2. **Must의 핵심 작업량.**

### 3.1 `editor2d/elements`
요소 정의 + 렌더링. 최소 3개 카테고리: **일러스트 / 레터링 / 파이핑**. (이미지=S4는 범위 밖)

### 3.2 `editor2d/canvas` (View)
- 전개도 + 요소 렌더, 선택 핸들(이동/8방향 스케일/회전) 표시, 히트테스트
- 포인터 이벤트를 `tools` 명령으로 위임. **계산 없음.**

### 3.3 `editor2d/tools` (ViewModel)
- 이동, 대각/모서리 스케일(비율 고정·고정점), 회전, 삭제
- 제스처 상태(시작 transform·피벗) 추적 → `store` 액션 호출
- 좌표/회전 수학은 `geometry` 사용. **Canvas/R3F 미import.**

### 3.4 `editor2d/panels` (View)
- 요소 라이브러리(일러스트/레터링/파이핑 자산 목록) → `store.addElement`
- 속성 패널: 레이어 순서 변경, 레터링 **텍스트·폰트·색상** 변경 → store 액션
- 입력 위임만, 로직 없음.

**완료 기준 (PRD-M3 수용 기준)**:
- [ ] 3개 카테고리 제공.
- [ ] 이동/확대축소/회전/삭제/레이어 순서 변경 동작.
- [ ] 레터링 텍스트·폰트·색상 변경 동작.

---

## Phase 4 — PRD-M4: 3D 뷰 확인 + 전환 동기화 (`viewer3d`)

**의존**: Phase 1~3. **동기화는 변환이 아니라 재렌더링**임을 구현으로 증명.

### 4.1 `viewer3d/meshes` (View)
- shape별 메시: 원형=실린더, 사각=박스, 하트=압출. 치수는 `spec`에서. UV는 `geometry` 규칙대로.

### 4.2 `viewer3d/texture` (ViewModel, 동기화 핵심)
- `document/store` 구독 → **오프스크린 캔버스에 전개도(요소 포함)를 그려 텍스처로 굽기** → 메시에 UV 매핑
- 디바운스/부분 갱신으로 성능 확보. **이게 견고하면 전개도↔3D 동기화가 "공짜".**

### 4.3 `viewer3d/controls` (View)
- 360° 회전·확대축소(카메라). (3D 직접배치=S2는 범위 밖)
- 전개도↔3D 뷰 **전환** UI: 전환 시 최신 store 기준으로 텍스처 재생성.

**완료 기준 (PRD-M4 수용 기준)**:
- [ ] 전개도↔3D 전환 가능.
- [ ] 3D 전환 시 최신 디자인(요소·색상)이 반영된다.
- [ ] 360° 회전·확대축소 동작.

---

## Phase 5 — PRD-M5: 서버 저장 & 링크 공유 (비로그인) (`api` + `web/share`)

**의존**: Phase 1(스키마). 백엔드와 프론트 share/api 클라이언트.

### 5.1 백엔드 `apps/api/src`
- `designs/`: 디자인 문서 CRUD + **복제(clone)**. 저장은 `shared/schema`로 검증.
- `share/`: **`editToken`**(작성자 수정)·**`viewToken`**(비로그인 열람) 발급·검증. 두 링크는 **서로 다른 고유 URL**. 토큰은 추측 불가능하게 생성.
- `infra/`: DB(문서·토큰) 연동. (이미지 스토리지는 S4 범위)
- 라우트(초안):
  - `POST /designs` → 저장 + `{ editToken, viewToken }` 반환
  - `GET /designs/by-edit/:editToken` → 편집용 로드
  - `GET /designs/by-view/:viewToken` → 열람용 로드(읽기)
  - `PUT /designs/by-edit/:editToken` → 작성자 수정 저장
  - `POST /designs/by-view/:viewToken/clone` → 복제 후 새 edit/view 토큰 발급

### 5.2 프론트 `apps/web/src/api` + `apps/web/src/share`
- `api/`: 위 엔드포인트 호출 클라이언트(스키마 타입 재사용, 로직·상태 없음).
- `share/`: 편집 링크 진입(작성자 수정), 열람 링크 진입(비로그인 열람) + **열람자의 복제 후 수정** 흐름. 저장 후 두 URL 노출.

**완료 기준 (PRD-M5 수용 기준)**:
- [ ] 서버 저장 동작.
- [ ] 편집 링크로 작성자가 수정 가능.
- [ ] 열람 링크로 비로그인 열람·복제 후 수정 가능.
- [ ] 편집/열람 링크가 서로 다른 고유 URL.

---

## 6. 의존 그래프 / 권장 순서

```
Phase 0 부트스트랩
  └─ Phase 1 schema + geometry(하트 PoC) + store     ← 위험 선검증
       ├─ Phase 2 cake (M1·M2)
       │     └─ Phase 3 editor2d (M3)
       │           └─ Phase 4 viewer3d/texture (M4)
       └─ Phase 5 api + share (M5)   ← Phase 1 이후 병렬 진행 가능
```

- **Phase 5(M5)** 는 Phase 1의 스키마만 있으면 2~4와 **병렬** 진행 가능(다른 작업자/세션).
- **하트 PoC(1.2)** 가 막히면: 원형·사각 2종으로 M1 선출시 → 하트는 Should 직후로 이관(루트 PRD 변경은 보고 후).

## 7. 교차 검증(완료 정의)

- [ ] **동기화 회귀 테스트**: 2D에서 요소 추가/이동/색변경 → 3D 전환 시 반영(스냅샷/시각).
- [ ] **좌표 단일화 테스트**: 모든 변환이 `geometry` 경유(인라인 계산 grep로 점검).
- [x] **레이어 경계 린트**: `tools`/`store`/`texture`에서 three/r3f/canvas import 0건. *(Phase 0에서 룰 구축·검증 완료)*
- [ ] **공유 왕복 테스트**: 저장 → editToken 수정 → viewToken 열람·복제 → 복제본 독립 수정.

## 8. Must 범위 밖(혼동 방지)

이미지 업로드(S4), 손그림(S1), 3D 직접배치(S2), 3D 데코(S3), 규격조정(S5), undo/redo(C2) 등은 **본 계획 범위 아님**. 단, Phase 1의 `schema`/`geometry`/`store` 설계 시 이들 확장을 막지 않도록 타입·인터페이스를 남겨둔다(예: `Element.type`에 'drawing'/'image', `decorations3d`, `recomputeForSpec`).
```
