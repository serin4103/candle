# Phase 3 실행 계획 — PRD-M3: 전개도 2D 요소 배치 (`editor2d`)

> 출처: [docs/PLAN-MUST.md](./PLAN-MUST.md) Phase 3 · 생성일: 2026-05-29
> 아키텍처·폴더 역할은 루트 [CLAUDE.md](../CLAUDE.md) 단일 출처를 따른다.

## 목표

전개도 위에 **일러스트/레터링/파이핑** 3개 카테고리 요소를 올리고,
이동·확대축소·회전·삭제·레이어 순서 변경을 하며, 레터링의 텍스트·폰트·색상을 바꾼다.
모든 편집은 `document/store`에만 쓰고, 좌표/회전 수학은 `shared/geometry` 순수 함수로 한다.

## 좌표 모델 (결정)

- 요소 `transform.x/y`는 **`getNet` 전개도 좌표계(cm)** 기준 — `net.bounds` 원점(좌상단) 기준.
- 캔버스는 geometry의 `net.side`(0,0)·`net.top`을 **그대로** 그린다(Phase 2 `NetPreview`의 재배치 레이아웃이 아니라 geometry 좌표 그대로). 이래야 Phase 4의 `uvForNetPoint`가 같은 좌표로 직결된다.
- 화면(픽셀)→전개도 변환은 SVG `getScreenCTM().inverse()`로 한다(SVG 사용자 단위=cm=전개도 좌표). 팬/줌(`viewport`)은 Must 수용 기준이 아니므로 Phase 3에서는 기본값 고정.
- 요소는 `transform.x/y`를 **중심점**으로 두고 회전/스케일 피벗으로 쓴다(`geometry.applyInverseRotation`과 정합).

## 작업 항목

- [x] W1 (geometry) `applyForwardRotation(transform, local)` 추가 — 로컬 오프셋→전개도 점(핸들 배치·스케일 피벗 계산용). `applyInverseRotation`의 역. + 단위 테스트. — depends-on: 없음
- [x] W2 (elements) `elements/catalog.ts` — 일러스트/파이핑/폰트 카탈로그 + `elementLocalSize(element)`(스케일1 로컬 cm) 순수 함수. + 테스트. — depends-on: 없음
- [x] W3 (elements) `elements/ElementView.tsx` — 요소 1개를 SVG `<g transform>`로 렌더(중심 0,0). 일러스트(이모지)·레터링(text)·파이핑(variant 도형). — depends-on: W2
- [x] W4 (tools) `tools/handles.ts` — `hitTestElement`·`pickTopElement`·`handlePositions`(코너4+회전) 순수 함수(geometry 사용, 렌더 기술 미import). — depends-on: W1
- [x] W5 (tools) `tools/gestures.ts` — `beginMove/beginScale/beginRotate` + `applyGesture` 순수 함수(시작 transform·피벗 추적, 패치 반환). — depends-on: W1
- [x] W6 (tools) `tools/tools.test.ts` — 히트테스트/picking/제스처(이동·대각 스케일·회전) 단위 테스트. — depends-on: W4, W5
- [x] W7 (canvas) `canvas/NetEditor.tsx` — 전개도(side+top)·요소(zIndex 정렬) 렌더, 선택 핸들 표시, 포인터 이벤트를 tools로 위임, 키보드 삭제. — depends-on: W3, W4, W5
- [x] W8 (panels) `panels/LibraryPanel.tsx` — 카탈로그 목록 → `store.addElement`(side 중앙 배치) 후 선택. — depends-on: W2
- [x] W9 (panels) `panels/PropertiesPanel.tsx` — 레터링 텍스트·폰트·색상(`updateLettering`), 레이어 앞/뒤(`reorderElement`), 삭제(`deleteElement`). — depends-on: 없음(store만)
- [x] W10 (app) `App.tsx`·각 `index.ts` 배선 — 좌측(케이크+라이브러리)·중앙(NetEditor)·우측(속성) 3열. — depends-on: W7, W8, W9

## 실행 계획 (병렬성)

- **Wave 1 (병렬 가능):** W1, W2 — 서로 다른 패키지/폴더(geometry vs elements), 공유 상태 없음.
- **Wave 2 (병렬 가능):** W3(elements/W2), W4(tools/W1), W5(tools/W1), W9(panels/store) — 건드리는 파일이 모두 다르고 W1·W2 산출물만 소비.
- **Wave 3 (병렬 가능):** W6(tools 테스트/W4·W5), W8(panels/W2) — 서로 다른 파일.
- **Wave 4 (순차):** W7 — W3·W4·W5를 소비하는 캔버스.
- **Wave 5 (순차):** W10 — 모든 View 배선.

## 완료 기준 (PLAN-MUST Phase 3)

- [ ] 3개 카테고리(일러스트/레터링/파이핑) 제공.
- [ ] 이동/확대축소/회전/삭제/레이어 순서 변경 동작.
- [ ] 레터링 텍스트·폰트·색상 변경 동작.

## 범위 밖 (혼동 방지)

이미지 업로드(S4), 손그림 펜(S1), 팬/줌, 3D 반영(Phase 4)은 본 계획 밖.
단 `schema`의 `image`/`drawing` 타입은 건드리지 않고 보존한다.
