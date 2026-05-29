# Must Phase 1 실행 계획 — Model 토대

> 소스: [docs/PLAN-MUST.md](./PLAN-MUST.md) Phase 1 · 생성일: 2026-05-29
> 아키텍처·폴더 역할의 정의는 루트 [CLAUDE.md](../CLAUDE.md)를 따른다.

**목표**: 단일 디자인 문서의 토대를 만든다 — `schema`(타입·검증), `geometry`(전개도·UV·좌표 변환, 하트 PoC), `document/store`(진실의 원천). 이후 모든 Phase가 이 세 모듈을 딛고 선다.

**전제(의존)**: Phase 0(부트스트랩) 완료 — 완료 기준 4개 모두 체크됨. ✅

---

## 작업 항목

### 1.1 `packages/shared/schema` (zod 타입 + 검증)
- [x] `Shape`(circle/square/heart), `Transform`(x·y·scale·rotation, x·y는 전개도 좌표), `Spec`(size 호수·height·layers 단) 정의 — `schema/index.ts`
- [x] `Element` 판별 유니온: illustration·lettering·piping(Must) + drawing·image(S1/S4 대비 선언) — 공통 base(id·transform·zIndex) + 타입별 payload(레터링 text/font/color)
- [x] `Design`(id·shape·baseColor·creamColor·spec·elements·decorations3d) 정의
- [x] `ShareLink`(designId·editToken·viewToken) 정의
- [x] (선언만) `Decoration3D`, `Asset` — 문서 형식 단일성 유지, Must 미사용
- [x] `validateDesign`/`validateElement` 검증 함수 — **타입+검증만, 로직 없음**

### 1.2 `packages/shared/geometry` (순수 함수, 하트 PoC 최우선)
- [x] `diameterForSize(size)` — 호수→지름 규약(1호=15cm, 호당 +3cm) + 상수
- [x] `buildCrossSection(shape, spec)` — shape별 단면 외곽선(top-down xz) + 누적 호장·둘레. 하트는 파라메트릭 곡선 샘플링으로 검증
- [x] `getNet(shape, spec)` — 전개도 정의(옆면 펼친 사각형 + 윗면 영역 + 전체 bounds + 단면)
- [x] `uvForNetPoint(shape, spec, point)` — 전개도 점→메시 UV(구운-전개도 정규화 규약)
- [x] `boundaryPointForU(shape, spec, u)` — 옆면 u좌표→단면 경계점(하트 옆면↔3D 매핑 PoC, S2/메시 대비)
- [x] `screenToNet`/`netToScreen`(viewport pan/zoom) — 픽셀↔전개도 왕복
- [x] `applyInverseRotation(transform, point)` — 회전 요소 로컬 좌표(M3 핸들·S2 대비)
- [x] `recomputeForSpec(shape, spec)` — 규격 변경 시 전개도·파생치 재계산(M4/S5 대비)

### 1.3 `apps/web/src/document/store` (Zustand, 진실의 원천)
- [x] `createDefaultDesign()` 팩토리 — 기본 Design 생성(검증 통과)
- [x] 상태: `design`, `selectedId`, `viewport`(팬/줌)
- [x] 액션: `setShape`, `setBaseColor`, `setCreamColor`, `addElement`, `moveElement`, `scaleElement`, `rotateElement`, `deleteElement`, `reorderElement`, `updateLettering`, `select`, `setViewport`, `loadDesign`, `getDesignSnapshot`
- [x] **렌더 기술(three/r3f/canvas) import 금지**, 계산은 geometry로 위임 가능하게 구성 (린트로 검증)

### 검증용 테스트
- [x] `geometry` 단위 테스트(전 shape getNet, UV, 좌표 왕복, 회전 역변환, **하트 PoC**) — 21개 통과
- [x] `schema` 검증 테스트(정상/이상 입력) — 6개 통과
- [x] `store` 액션 단위 테스트(추가/이동/스케일/회전/삭제/재정렬/레터링/로드·스냅샷) — 13개 통과

---

## 완료 기준 (마스터 문서 Phase 1 그대로 복사)

- [ ] 스토어 액션 단위 테스트 통과.
- [ ] geometry 변환 함수 테스트 통과(하트 포함 또는 리스크 보고).
