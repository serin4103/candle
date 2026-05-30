// document/history — undo/redo (PRD-C2) 커맨드 스택.
// 규칙(CLAUDE.md): 순수 함수/클로저. 렌더 기술(three/r3f/canvas)·React·Zustand import 금지.
import type { Design } from '@candle/shared';
import type { Command } from './types';

/** 기본 스택 깊이. 초과분은 바닥(가장 오래된 것)부터 폐기한다. */
const DEFAULT_MAX_DEPTH = 100;

export interface CommandStack {
  /** 새 커맨드를 푸시. redo 스택은 비운다. 깊이 초과 시 가장 오래된 것 폐기. */
  push(command: Command): void;
  /**
   * 직전 커맨드를 꺼내 그 before 스냅샷(깊은 복사본)을 반환(없으면 null).
   * 꺼낸 커맨드는 redo 스택으로 옮긴다.
   */
  undo(): Design | null;
  /**
   * redo 스택의 커맨드를 꺼내 그 after 스냅샷(깊은 복사본)을 반환(없으면 null).
   * 꺼낸 커맨드는 다시 undo 스택으로 옮긴다.
   */
  redo(): Design | null;
  canUndo(): boolean;
  canRedo(): boolean;
  /** 두 스택 모두 비운다(문서 로드 시). */
  clear(): void;
}

/**
 * 커맨드 스택을 만든다. undo/redo 스택과 깊이 제한을 클로저로 보관한다.
 * 반환하는 스냅샷은 항상 깊은 복사본이라 스택 내부 객체가 외부와 공유되지 않는다.
 */
export function createCommandStack(maxDepth: number = DEFAULT_MAX_DEPTH): CommandStack {
  let undoStack: Command[] = [];
  let redoStack: Command[] = [];

  return {
    push(command) {
      undoStack.push(command);
      // 새 편집이 일어나면 redo 분기는 더 이상 유효하지 않다.
      redoStack = [];
      // 깊이 초과 시 가장 오래된 커맨드부터 폐기.
      if (undoStack.length > maxDepth) {
        undoStack = undoStack.slice(undoStack.length - maxDepth);
      }
    },

    undo() {
      const command = undoStack.pop();
      if (!command) return null;
      redoStack.push(command);
      return structuredClone(command.before);
    },

    redo() {
      const command = redoStack.pop();
      if (!command) return null;
      undoStack.push(command);
      return structuredClone(command.after);
    },

    canUndo() {
      return undoStack.length > 0;
    },

    canRedo() {
      return redoStack.length > 0;
    },

    clear() {
      undoStack = [];
      redoStack = [];
    },
  };
}
