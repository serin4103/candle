# Must Phase 2 실행 계획 — 시트 모양·색상 선택 (`cake`, PRD-M1/M2)

> 소스: [docs/PLAN-MUST.md](./PLAN-MUST.md) Phase 2 · 생성일: 2026-05-29
> 아키텍처·폴더 역할은 루트 [CLAUDE.md](../CLAUDE.md), UI 톤은 사용자가 제시한 케이크릿 목업을 따른다.

**목표**: 케이크 시트 모양(원형/사각/하트)과 색상(시트색·크림색)을 고르면 전개도 프리뷰가 즉시 그 모양·색으로 갱신된다. Phase 1의 store·geometry를 View에 연결하는 첫 화면.

**전제(의존)**: Phase 1 완료(✅ — schema/geometry/store, 완료 기준 체크됨).

**범위 경계**: 일러스트/레터링/파이핑 패널(Phase 3), 3D 토글(Phase 4), 공유(Phase 5), undo/redo(C2)는 만들지 않는다. 전개도 프리뷰는 **읽기 전용 최소 렌더**(요소 배치·핸들·히트테스트 없음) — 그건 Phase 3.

---

## 작업 항목

### W1 `ui/` 테마 토큰 + 공통 컴포넌트 (View, 도메인 비의존)
- [x] W1a `ui/theme.ts` — 목업 팔레트·라운드·그림자 토큰(순수 상수) — depends-on: 없음
- [x] W1b `ui/Button.tsx`, `ui/Panel.tsx` 등 공통 표현 컴포넌트 — depends-on: W1a
- [x] W1c `ui/ColorPicker.tsx` — 팔레트 스와치 + 네이티브 컬러 인풋(PRD-M2 "팔레트 또는 컬러 피커") — depends-on: W1a

### W2 `cake/` 모양·색상 선택 (View → store 액션 위임)
- [x] W2a `cake/ShapeSelector.tsx` — 원형/사각/하트 3종 버튼 → `store.setShape` — depends-on: W1, store(Phase1)
- [x] W2b `cake/ColorControls.tsx` — 시트색/크림색 → `store.setBaseColor`/`setCreamColor` — depends-on: W1c, store
- [x] W2c `cake/CakeControls.tsx` — 위 둘을 묶는 좌측 패널 — depends-on: W2a, W2b
- [x] W2d `cake/index.ts` — export

### W3 `editor2d/canvas/` 전개도 프리뷰 (읽기 전용 View)
- [x] W3a `editor2d/canvas/netPath.ts` — Net→SVG 경로(top 윤곽·side 스캘럽) 순수 표현 헬퍼 — depends-on: geometry(Phase1)
- [x] W3b `editor2d/canvas/NetPreview.tsx` — store 구독 → `geometry.getNet`로 "윗면·TOP/옆면·SIDE(전개)" 렌더, baseColor/creamColor 반영 — depends-on: W3a, W1a, store
- [x] W3c `editor2d/canvas/index.ts` — export

### W4 앱 셸 조립 (목업 톤)
- [x] W4a `App.tsx` — 상단 브랜드바 + 좌측 `CakeControls` + 캔버스 `NetPreview`, 파스텔 레이아웃 — depends-on: W2, W3

### 검증
- [x] W5a `netPath`/프리뷰 헬퍼 순수 단위 테스트(shape별 경로 상이, spec 반영) — depends-on: W3a — 4개 통과
- [x] W5b 런타임 스모크: dev 서버 띄워 3종 모양(원형·하트·사각형) 전환·시트색 변경이 프리뷰에 즉시 반영됨을 스크린샷으로 확인 — depends-on: W4

## 실행 계획 (병렬성)
- **Wave 1 (병렬 가능):** W1a, W3a — 서로 다른 폴더, 공유 상태 없음(테마 상수 vs 경로 헬퍼)
- **Wave 2 (병렬 가능):** W1b·W1c(테마 의존), W3a 완료 후 W5a — UI 프리미티브와 경로 테스트는 독립
- **Wave 3:** W2(cake, ui+store 의존), W3b(canvas, 경로헬퍼+테마+store 의존)
- **Wave 4:** W4(셸, cake+canvas 의존) → W5b(스모크)

> 실제로는 파일 수가 적어 순차로 구현하되, 위 의존 관계를 지켜 막힘 없이 진행한다.

---

## 완료 기준 (마스터 문서 Phase 2 그대로 복사)

- [x] 3종 모양 선택 가능, 선택 시 전개도 뷰가 해당 모양에 맞게 구성된다.
- [x] 팔레트/피커로 고른 색이 전개도에 즉시 반영된다(3D 반영은 Phase 4에서 검증).

## 변경 이력 (사용자 요청)

- **옆면 길이 = 윗면 둘레 비례**: `NetPreview`를 윗면·옆면 공통 cm 스케일로 다시 그려,
  옆면 폭이 `net.side.width`(= 단면 둘레)에 비례해 모양별로 달라지게 함
  (원형 π·d ≈ 47 < 사각 4·d = 60). `netPath`는 fit-to-box → cm 평행이동 방식으로 변경.
  단위 테스트로 `side.width === 둘레`, `사각 > 원` 확인.
- **시트색 선택 제거 → 크림색만**: `ColorControls`에서 시트색 피커 삭제, 케이크 표면색을
  크림색(사용자 선택)으로 칠함. 스캘럽/테두리는 `shade(creamColor, -0.12)` 파생색,
  기본 크림색 `#fce8c8`. `sheetSwatches` 제거.
  - **PRD 메모**: 루트 PRD-M2는 "시트(및 크림) 베이스 색상"을 명시하나, 사용자 지시로
    시트색 *선택 UI* 를 제외함. `schema.baseColor`(Model)는 단일 형식 유지를 위해 보존(기본값
    고정). 루트 CLAUDE.md PRD 문구 수정은 별도 보고 후 동기화 대상.
