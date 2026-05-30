// document/history/useUndoRedoShortcuts — undo/redo 키보드 단축키(View 바인딩).
// 주의: 이 파일은 history '코어'(types/commandStack)가 아니라 View 바인딩이라 React를 쓴다.
//       코어(순수 스냅샷 스택)는 여전히 React/렌더 기술을 import하지 않는다(Phase 1 불변식).
import { useEffect } from 'react';
import { useDesignStore } from '../store';

export type UndoRedoAction = 'undo' | 'redo' | null;

/** matchUndoRedoKey가 보는 최소 키 이벤트 형태(DOM 비의존 — 단위 테스트 가능). */
export interface KeyChord {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  /** 입력 필드/contentEditable에 포커스되어 있어 단축키를 무시해야 하는지. */
  editableTarget: boolean;
}

/**
 * 키 조합을 undo/redo 동작으로 판정한다(순수).
 * - Cmd/Ctrl+Z → undo
 * - Cmd/Ctrl+Shift+Z, 또는 Ctrl+Y → redo
 * - 입력 필드 포커스 중이면 무시(텍스트 편집의 기본 undo 보존)
 * - 수식키(meta/ctrl) 없으면 무시
 */
export function matchUndoRedoKey(e: KeyChord): UndoRedoAction {
  if (e.editableTarget) return null;
  const mod = e.metaKey || e.ctrlKey;
  if (!mod) return null;
  const key = e.key.toLowerCase();
  if (key === 'z') return e.shiftKey ? 'redo' : 'undo';
  if (key === 'y') return 'redo';
  return null;
}

/** DOM 이벤트 대상이 편집 가능한 입력인지. */
function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

/**
 * undo/redo 키보드 단축키를 store에 연결한다.
 * @param enabled 편집 맥락(전개도 뷰)에서만 true. 3D 읽기 전용/열람 모드에선 false → 리스너 미등록.
 */
export function useUndoRedoShortcuts(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    function onKey(e: KeyboardEvent) {
      const action = matchUndoRedoKey({
        key: e.key,
        metaKey: e.metaKey,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        editableTarget: isEditableTarget(e.target),
      });
      if (!action) return;
      e.preventDefault();
      // getState로 최신 액션 직접 호출(셀렉터 재구독 불필요, stale closure 회피).
      const store = useDesignStore.getState();
      if (action === 'undo') store.undo();
      else store.redo();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled]);
}
