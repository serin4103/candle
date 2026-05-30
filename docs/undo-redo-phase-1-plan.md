# undo-redo Phase 1 상세 실행 plan

> 소스: [docs/PLAN-UNDO-REDO.md](PLAN-UNDO-REDO.md) · Phase 1 (History 코어: 커맨드 스택) · 생성일 2026-05-30

## 목표
디자인 스냅샷을 담는 **순수 커맨드 스택**을 `document/history`에 만든다. store·UI와 무관하게 단위 테스트로 검증 가능해야 한다.

## 작업 항목
- [x] W1 (`history/types.ts`) — `Command`(label/before/after: Design) 인터페이스, `HistoryState`(canUndo/canRedo 파생 플래그) 타입 정의 — depends-on: 없음
- [x] W2 (`history/commandStack.ts`) — `createCommandStack(maxDepth?)` 순수 팩토리: push/undo/redo/canUndo/canRedo/clear. 스냅샷은 반환 시 깊은 복사. 렌더 기술·React import 금지 — depends-on: W1
- [x] W3 (`history/index.ts`) — 타입·팩토리 re-export — depends-on: W1, W2
- [x] W4 (`history/commandStack.test.ts`) — push→undo→redo 순서, undo 후 push 시 redo 비움, 빈 스택 null, maxDepth 폐기 — depends-on: W2

## 실행 계획 (병렬성)
- **Wave 1 (순차):** W1 — 다른 작업이 `Command` 타입에 의존
- **Wave 2 (순차):** W2 — W1 타입 소비
- **Wave 3 (병렬 가능):** W3, W4 — 둘 다 W2 산출물만 소비하고 서로 다른 파일, 공유 상태 없음

> 파일이 4개로 작고 직렬 의존이 강하다(types→stack→{index,test}). 실질 병렬 여지는 Wave 3뿐.

## 완료 기준 (소스 Phase 1) — 전부 충족
- [x] `push → undo → redo` 순서가 올바른 스냅샷을 반환 (단위 테스트)
- [x] undo 후 새 push 시 redo 스택 비워짐 (단위 테스트)
- [x] 빈 스택에서 undo()/redo()는 null, canUndo()/canRedo() false
- [x] maxDepth 초과 시 가장 오래된 커맨드 폐기 (단위 테스트)
- [x] history 코어에 three/r3f/canvas/react import 0건 (레이어 경계 린트)

## 검증 결과
- `pnpm --filter @candle/web test`: ✅ 89 passed (history 7 신규 포함)
- `pnpm --filter @candle/web typecheck`: ✅ 통과
- `eslint apps/web/src/document/history`: ✅ 통과
- import 점검: `@candle/shared` 타입·로컬 `Command`만 — 렌더 기술/React/Zustand 0건
