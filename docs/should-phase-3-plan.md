# Should Phase 3 상세 실행 plan — PRD-S1 전개도 손그림 그리기

> 소스: [docs/PLAN-SHOULD.md](./PLAN-SHOULD.md) Phase 3 · 생성일 2026-05-29
> 기능·아키텍처 정의는 루트 [CLAUDE.md](../CLAUDE.md) PRD를 단일 출처로 한다.
> 워크트리: `.claude/worktrees/phase-3-drawing` (브랜치 `feat/phase-s1-drawing`).
> Phase 2(PRD-S4)는 `.claude/worktrees/phase-2-image-upload`에서 병행 중 — 본 phase는 그와
> 독립이되 공유 파일 2곳(`editor2d/elements/elementSvg.ts`, `viewer3d/texture`)에서 만난다.

## 목표

전개도 위에 펜으로 자유 손그림을 그리고(브러시 굵기·색상 조절), 획 단위로 지운다. 그린 손그림은
다른 요소와 동일하게 `document/store`의 `Design.elements`에 `DrawingElement`로 저장돼 3D 굽기에
자동 반영된다.

## 전제 / 근거

- schema `DrawingElement`(`points`/`color`/`width`)는 **이미 선언됨**(재정의 금지, 채워 쓰기).
- 굽기는 `buildNetSvg`가 모든 요소를 `elementGroupMarkup`으로 직렬화 → **`elementInnerMarkup`에
  `drawing` 분기만 추가하면 3D 반영이 "공짜"**.
- 좌표 변환은 캔버스가 SVG CTM 기반 `toNet`으로 화면→전개도(cm) 변환을 이미 수행(파이핑과 동일
  경로). 저장 좌표는 전개도 cm — 픽셀 저장 아님(좌표 단일화 충족).

### 설계 결정 (근거 있는 선택)

1. **점 저장 = 절대 전개도 좌표 + 항등 transform.** `DrawingElement.points`는 전개도 절대 좌표로
   저장하고 `transform`은 `{x:0,y:0,scale:1,rotation:0}`. `elementGroupMarkup`의 translate/rotate/
   scale가 항등이라 2D·3D가 같은 절대 좌표를 그린다. → S1 범위(그리기+획 지우개)에 필요충분.
   *(드래그 이동/스케일/회전은 S1 수용 기준이 아님 — 그래서 손그림은 선택 핸들 대상에서 제외.)*
2. **`geometry.screenToNet` 대신 캔버스 `toNet`(SVG CTM) 사용.** 이 캔버스는 viewport 팬/줌 픽셀
   모델이 아니라 SVG viewBox로 스케일한다(파이핑 런과 동일). `screenToNet(viewport,…)`는 기본
   viewport에서 잘못된 결과를 준다. **불변식의 본질("픽셀이 아닌 전개도 좌표를 저장")은 유지** —
   점은 cm 단위로 저장된다.
3. **모드 상호배타.** `drawingTool`(pen/eraser)과 기존 `pendingPiping`은 동시에 켜질 수 없게 store
   액션에서 서로를 해제한다(View는 단순 유지).
4. **지우개 = 요소 단위 삭제.** 1획 = `DrawingElement` 1개이므로 별도 자료구조 없이 hit-test 후
   `deleteElement`. 드래그하며 닿는 획을 연속 삭제.

## 작업 항목

- [x] W1 (`editor2d/tools/drawing.ts`) 펜·지우개 순수 계산: 점 샘플링(`appendStrokePoint`, 최소
  간격), 점-선분 거리(`pointToSegmentDistance`), 획 hit-test(`pickStrokeAt`). 렌더 기술 미import. — depends-on: 없음
- [x] W2 (`editor2d/elements/elementSvg.ts`) `drawingMarkup` 추가 + `elementInnerMarkup`의
  `drawing` 분기 연결(polyline, color·width, round cap/join). — depends-on: 없음 *(공유 파일 — Phase 2와 충돌 주의: 분기 추가만)*
- [x] W3 (`editor2d/elements/catalog.ts`) `elementLocalSize`의 `drawing`을 점 bbox로 정직하게
  계산(현재 더미 박스 대체). — depends-on: 없음
- [x] W4 (`document/store/designStore.ts`) 상태 `drawingTool: 'pen'|'eraser'|null`, `brush:{color,
  width}`; 액션 `setDrawingTool`/`setBrush`/`addDrawing(points,color,width)`. 모드 상호배타
  (`setDrawingTool`↔`setPendingPiping`). — depends-on: 없음
- [x] W5 (`editor2d/panels/DrawingPanel.tsx` + `panels/index.ts`) 펜/지우개 토글, 브러시 굵기
  슬라이더·색상 선택 UI. store 액션 호출만. — depends-on: W4
- [x] W6 (`editor2d/canvas/NetEditor.tsx`) 펜/지우개 포인터 분기(그리기 시 점 수집·라이브
  미리보기, 지우개 시 `pickStrokeAt`→`deleteElement`), 손그림은 선택 picking 제외, 모드별 커서. — depends-on: W1, W4
- [x] W7 (`App.tsx`) 좌측 패널에 `DrawingPanel` 마운트(readOnly 게이팅). — depends-on: W5
- [x] W8 테스트: `tools/drawing.test.ts`(샘플링·거리·hit-test), `designStore.test.ts`
  (addDrawing/모드 배타), `bakeNet.test.ts`(굽기 SVG에 손그림 polyline 포함). — depends-on: W1·W2·W4

## 실행 계획 (병렬성)

- **Wave 1 (병렬 가능):** W1, W2, W3, W4 — 서로 다른 파일, 공유 상태 없음.
- **Wave 2 (병렬 가능):** W5(←W4), W6(←W1·W4) — 다른 파일(panel vs canvas).
- **Wave 3 (순차):** W7(←W5) — App 마운트.
- **Wave 4 (병렬 가능):** W8 — 구현 완료 후 테스트(여러 test 파일, 독립).

## 완료 기준 매핑 (소스 Phase 3)

- 전개도에 펜으로 손그림 → W1·W4·W6 + 런타임
- 브러시 굵기·색상 변경 반영 → W2·W4·W5 + 런타임
- 획 단위 지우개 → W1·W6 + 단위 테스트
- 3D 전환 시 텍스처 반영 → W2 + `bakeNet` 테스트
- 저장 좌표가 전개도 좌표계(픽셀 인라인 0건) → 설계 결정 1·2 + grep

## 범위 밖

- 손그림 요소의 이동/스케일/회전 핸들(S1 수용 기준 아님 — 항등 transform 유지).
- undo/redo(PRD-C2) — 단 "1획=1요소=1커밋" 규칙은 미래 C2를 막지 않게 유지.
