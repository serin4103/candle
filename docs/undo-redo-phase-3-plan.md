# undo-redo Phase 3 상세 실행 plan

> 소스: [docs/PLAN-UNDO-REDO.md](PLAN-UNDO-REDO.md) · Phase 3 (트리거 UI: 단축키 + 되돌리기/다시실행 버튼) · 생성일 2026-05-30
> 선행: Phase 1·2 완료 — store가 `undo`/`redo`/`canUndo`/`canRedo` 노출.

## 목표
사용자가 키보드 단축키와 버튼으로 undo/redo를 실행하고, 가능 여부가 버튼 상태에 드러난다. 편집 맥락(전개도 뷰)에서만 동작하고 3D 읽기 전용 뷰에선 비노출.

## 작업 항목
- [x] W1 (`document/history/useUndoRedoShortcuts.ts`) — `matchUndoRedoKey()` 순수 판정 함수(Cmd/Ctrl+Z=undo, +Shift 또는 Ctrl+Y=redo, 입력 필드 포커스 시 무시) + 이를 쓰는 `useUndoRedoShortcuts(enabled)` 훅(keydown 리스너→store.undo/redo). View 바인딩이라 React를 쓴다(코어 types/commandStack은 여전히 React-free) — depends-on: 없음(Phase 2 store API 소비)
- [x] W2 (`App.tsx`) — 되돌리기/다시실행 버튼(`canUndo`/`canRedo` 구독→disabled)을 전개도 뷰 툴바에 배치 + `useUndoRedoShortcuts(!readOnly && view==='net')` 호출 — depends-on: W1
- [x] W3 (`document/history/useUndoRedoShortcuts.test.ts`) — `matchUndoRedoKey` 단위 테스트(cmd+z→undo, cmd+shift+z·ctrl+y→redo, 입력 필드→null, 수식키 없음→null) — depends-on: W1

## 검증 결과
- `pnpm --filter @candle/web test`: ✅ 107 passed (matcher 7 신규 포함)
- `pnpm --filter @candle/web typecheck` / `build`: ✅ 통과
- `pnpm lint` (eslint .): ✅ 통과
- 런타임 스모크(dev 5174): 초기 버튼 둘 다 disabled → 요소 추가 시 되돌리기 enabled → Ctrl+Z로 요소 제거(되돌리기 disabled·다시실행 enabled) → Ctrl+Shift+Z로 복원 → 되돌리기 **버튼 클릭** undo도 동작 → 3D 전환 시 버튼 비노출·Ctrl+Z 무반응. 콘솔 에러 0건.

## 실행 계획 (병렬성)
- **Wave 1 (순차):** W1 — W2·W3가 import
- **Wave 2 (병렬 가능):** W2, W3 — 서로 다른 파일(App vs 테스트), 둘 다 W1만 소비, 공유 상태 없음

## 설계 메모
- **순수 판정 분리**: 키 조합 판정을 `matchUndoRedoKey(e)`(DOM 비의존)로 빼서 단위 테스트. 훅은 `e.target` 편집 가능 여부만 계산해 넘긴다.
- **stale closure 회피**: 핸들러에서 `useDesignStore.getState().undo()` 직접 호출(셀렉터 구독 대신) → 재구독 없이 항상 최신 액션.
- **enabled 게이트**: 3D 뷰·열람 모드에선 훅을 비활성(리스너 미등록)하고 버튼도 숨긴다(PRD-M4 읽기 전용).
- **입력 충돌**: `INPUT`/`TEXTAREA`/`SELECT`/contentEditable 포커스 중이면 무시 — 레터링 텍스트 편집의 브라우저 기본 undo 보존.
- **버튼 배치**: App 셸이 소유(기존 상단바/툴바 버튼 배치 책임과 동일). 전개도 뷰에서만 노출.

## 완료 기준 (소스 Phase 3, PRD-C2 수용 기준) — 전부 충족
- [x] Cmd/Ctrl+Z로 직전 편집 되돌림, Cmd/Ctrl+Shift+Z(또는 Ctrl+Y)로 다시 실행 (런타임)
- [x] 되돌리기/다시실행 버튼이 canUndo/canRedo에 따라 활성/비활성 (런타임)
- [x] 레터링 텍스트 입력 중 Cmd/Ctrl+Z가 요소 히스토리를 건드리지 않음 (matchUndoRedoKey 테스트 + 런타임)
- [x] 3D 뷰에서 편집 단축키·버튼 비노출 (런타임)
