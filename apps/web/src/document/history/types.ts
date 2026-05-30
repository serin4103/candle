// document/history — undo/redo (PRD-C2) 커맨드 타입.
// 규칙(CLAUDE.md): 순수 Model/ViewModel. 렌더 기술(three/r3f/canvas)·React import 금지.
// 디자인 문서 스냅샷(Design)만 다룬다.
import type { Design } from '@candle/shared';

/**
 * 한 번의 편집 동작을 되돌리고(undo) 다시 실행하기(redo) 위한 커맨드.
 * Design이 이미 불변 갱신되므로, 편집을 이전/이후 스냅샷으로 표현하는
 * 스냅샷 기반 메멘토 커맨드를 쓴다. undo는 before로, redo는 after로 복원한다.
 */
export interface Command {
  /** 사람이 읽는 라벨(예: '요소 이동', '색상 변경'). UI·디버깅용. */
  label: string;
  /** 이 편집 직전의 디자인 문서 스냅샷(깊은 복사본). undo 시 복원. */
  before: Design;
  /** 이 편집 직후의 디자인 문서 스냅샷(깊은 복사본). redo 시 복원. */
  after: Design;
}

/**
 * 히스토리의 구독 가능한 파생 플래그. Phase 2에서 store가 버튼 disabled 등에 쓴다.
 * (스택의 내부 배열이 아니라 "되돌리기/다시실행 가능 여부"만 노출한다.)
 */
export interface HistoryState {
  canUndo: boolean;
  canRedo: boolean;
}
