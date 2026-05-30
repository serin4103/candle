# undo-redo Phase 2 상세 실행 plan

> 소스: [docs/PLAN-UNDO-REDO.md](PLAN-UNDO-REDO.md) · Phase 2 (store 통합: 편집 액션을 커맨드로 + 트랜잭션 커밋 경계) · 생성일 2026-05-30
> 선행: Phase 1 완료(커맨드 스택 코어) — `document/history` 사용 가능.

## 목표
모든 디자인 편집이 자동으로 커맨드를 남기고, 드래그·연속 지우개는 1커밋으로 묶인다. store가 `undo`/`redo`/`canUndo`/`canRedo`/`beginTransaction`/`commitTransaction`을 노출한다.

## 작업 항목
- [x] W1 (`document/store/designStore.ts`) — 커맨드 스택 합성: `commit(label, mutate)` 헬퍼로 이산 액션 자동 커밋, 트랜잭션 변수(txActive/txBefore) + `beginTransaction`/`commitTransaction`, `undo`/`redo`, `canUndo`/`canRedo` 플래그, `loadDesign`에서 stack.clear — depends-on: 없음(Phase 1 산출물 import)
- [x] W2 (`editor2d/canvas/NetEditor.tsx`) — 연속 제스처 커밋 경계 배선: 이동/스케일/회전·지우개 드래그 시작 시 `beginTransaction`, pointer up·cancel에서 `commitTransaction`. ActiveGesture에 label 추가 — depends-on: W1
- [x] W3 (`document/store/history.test.ts`) — 이산 1커밋, redo, 드래그 N회→1undo, 연속 지우개→1undo, 표현 상태 비기록, loadDesign 초기화, undo 후 selectedId 정리 — depends-on: W1

## 검증 결과
- `pnpm --filter @candle/web test`: ✅ 100 passed (history.test.ts 11 신규 포함)
- `pnpm --filter @candle/web typecheck`: ✅ 통과
- `pnpm --filter @candle/web build`: ✅ 통과
- `pnpm lint` (eslint .): ✅ 통과
- 런타임 스모크: dev 서버에서 에디터 정상 렌더, 일러스트 추가(addElement→commit) 라이브 경로 콘솔 에러 0건, 속성 패널 갱신 확인. **사용자向 undo 트리거(단축키·버튼)는 Phase 3** → UI 조작 기반 undo 런타임 확인은 Phase 3로 이월.

## 실행 계획 (병렬성)
- **Wave 1 (순차):** W1 — store가 트랜잭션 API를 노출해야 W2가 호출 가능
- **Wave 2 (병렬 가능):** W2, W3 — 서로 다른 파일(View vs 테스트), 둘 다 W1의 store API만 소비, 공유 상태 없음

## 설계 메모
- **커밋 헬퍼**: `commit(label, mutate)` — 트랜잭션 중이면 push 보류(외부 commitTransaction이 묶음), 아니면 before/after 스냅샷 비교 후 변화가 있을 때만 push. 비교는 `JSON.stringify` 동등성으로 no-op 커맨드 방지.
- **불변 갱신 활용**: store 액션은 항상 새 `design` 객체를 만들므로 before 참조는 안전한 스냅샷. 스택이 반환 시 `structuredClone`하므로 추가 복사 불필요.
- **트랜잭션 닫기 안전성**: `onPointerCancel`에서도 열린 트랜잭션을 반드시 commit해 닫는다(안 닫으면 이후 자동 커밋이 영구 보류되는 버그).
- **표현 상태 제외**: `select`/`setViewport`/`setPendingPiping`/`setDrawingTool`/`setBrush`는 commit으로 감싸지 않는다.
- **연속 색상 입력 한계**: 네이티브 `<input type=color>` 드래그는 중간값마다 커밋될 수 있음(스와치 클릭은 1커밋). 디바운스는 본 phase 범위 밖 — 보고에 명시.

## 완료 기준 (소스 Phase 2)
- [x] 이산 동작 1회 → undo 1회로 직전 디자인 복원 (store 테스트)
- [x] redo로 되돌린 동작 재적용 (store 테스트)
- [x] 드래그 이동(move N회) → undo 1회로 전체 복원 (begin→move×N→commit 테스트)
- [x] 연속 지우개(여러 delete) → undo 1회로 모두 복원 (테스트)
- [x] 표현 상태 전용 액션은 히스토리 엔트리 안 만듦 (canUndo 불변 테스트)
- [x] loadDesign 후 canUndo·canRedo 모두 false (테스트)
- [x] undo로 선택 요소 사라지면 selectedId=null, viewport 불변 (테스트)
- [ ] 런타임: 2D 드래그 이동 후 1회 되돌리기로 원위치 복귀 → **Phase 3로 이월**(undo 트리거 UI 부재). 드래그→undo 동작은 트랜잭션 테스트로 증명.
