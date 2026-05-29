# Must Phase 4 실행 계획 — PRD-M4: 3D 뷰 확인 + 전환 동기화 (`viewer3d`)

> 소스: [docs/PLAN-MUST.md](./PLAN-MUST.md) Phase 4 · 생성일: 2026-05-29
> 아키텍처·기능 ID 정의는 루트 [CLAUDE.md](../CLAUDE.md)를 따른다.

## 목표
전개도 디자인을 3D 케이크에 매핑해 입체로 확인한다. **동기화 = 재렌더링**임을 구현으로 증명한다:
`document/store`를 구독 → 전개도를 텍스처로 굽기 → 메시에 UV 매핑. 전환 시 별도 변환 없이 최신 디자인이 반영된다.

## 의존 / 선행 확인
- Phase 1(schema·geometry·store), Phase 2(cake), Phase 3(editor2d) **완료됨** — PLAN-MUST.md 체크박스 [x] 확인.
- `getNet` / `crossSection` / `uvForNetPoint` / `boundaryPointForU` (geometry)와 요소 렌더(`editor2d/elements`)를 재사용한다.

## 핵심 설계 결정
1. **레이어 경계**: ESLint가 `viewer3d/texture/**`의 `three` import를 금지한다. 따라서
   `texture/`는 **오프스크린 캔버스만** 만들고(Canvas 2D DOM 허용), `three.CanvasTexture` 래핑은
   View(`CakeViewer3D`, `meshes`)가 한다.
2. **요소 렌더 단일화(DRY)**: 요소 SVG 마크업을 `editor2d/elements/elementSvg.ts`의 **순수 문자열 빌더**로
   추출하고, `ElementView`/`PipingRun`(View)과 텍스처 베이커(ViewModel)가 **같은 빌더**를 쓴다.
   좌표 로직은 기존 `shared/geometry`·`netPath`를 그대로 재사용(중복 구현 금지).
3. **통합 메시**: 원형/사각/하트 모두 `crossSection`(둘레 호장)으로부터 옆면 벽 + 윗면 뚜껑을 만든다.
   UV는 "구운-전개도 규약"(`uvForNetPoint`)대로 `netX/bounds.w`, `1 - netY/bounds.h`(CanvasTexture flipY 보정).

## 작업 항목
- [x] W1 (`editor2d/elements/elementSvg.ts`) 요소 inner/group SVG 마크업 순수 문자열 빌더 + `ElementView`/`PipingRun` 리팩터(같은 빌더 소비) — depends-on: 없음
- [x] W2 (`viewer3d/meshes/cakeGeometry.ts`) crossSection 기반 옆면·뚜껑 BufferGeometry + UV(굽기 규약) — depends-on: 없음
- [x] W3 (`viewer3d/texture/bakeNet.ts` + `index.ts`) `buildNetSvg(design)` 순수 + `rasterizeNetSvg`(canvas), `netTextureSize` — depends-on: W1
- [x] W4 (`viewer3d/meshes/CakeMesh.tsx` + `index.ts`) 메시 R3F 컴포넌트(텍스처 매핑) — depends-on: W2
- [x] W5 (`viewer3d/controls/CameraControls.tsx` + `index.ts`) OrbitControls 360° 회전·줌 — depends-on: 없음
- [x] W6 (`viewer3d/CakeViewer3D.tsx` + `index.ts`) R3F Canvas, store 구독→베이크→CanvasTexture→메시·조명·컨트롤 — depends-on: W3, W4, W5
- [x] W7 (`apps/web/src/App.tsx`) 전개도↔3D 전환 토글 + 중앙 뷰 스왑 — depends-on: W6
- [x] W8 테스트: `bakeNet.test.ts`(buildNetSvg 순수 검증), `cakeGeometry.test.ts`(UV 범위·정점 수) — depends-on: W2, W3

## 실행 계획 (병렬성)
- **Wave 1 (병렬 가능):** W1, W2, W5 — 서로 다른 폴더(`editor2d/elements`·`viewer3d/meshes`·`viewer3d/controls`), 공유 상태 없음.
- **Wave 2 (병렬 가능):** W3(W1 의존), W4(W2 의존) — 서로 다른 폴더.
- **Wave 3 (순차):** W6 — W3·W4·W5 산출물을 조립.
- **Wave 4 (순차):** W7 — W6 소비. W8(테스트)은 W2·W3 완료 후 병렬로.

## 완료 기준 (PRD-M4)
- [x] 전개도↔3D 전환 가능.
- [x] 3D 전환 시 최신 디자인(요소·색상) 반영.
- [x] 360° 회전·확대축소 동작.

## 범위 밖 (Phase 4 아님)
- 3D 직접배치(PRD-S2), 입체 데코(PRD-S3): `controls`/`decorations`는 카메라만. 역변환·데코 배치는 미구현.
- 규격 조정 UI(PRD-S5): 메시는 `spec`을 읽지만 조정 UI는 Phase 범위 밖(기본 spec).
