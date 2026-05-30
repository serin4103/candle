import { describe, it, expect, beforeEach } from 'vitest';
import type { Design } from '@candle/shared';
import { createDefaultDesign } from '../store/defaultDesign';
import { createCommandStack, type CommandStack } from './commandStack';
import type { Command } from './types';

/** creamColor만 다른 디자인 스냅샷을 만들어 before/after를 구별 가능하게 한다. */
function designWith(creamColor: string): Design {
  return { ...createDefaultDesign(), creamColor };
}

/** before→after 색 변경을 표현하는 커맨드. */
function colorCommand(before: string, after: string): Command {
  return { label: `색상 ${before}→${after}`, before: designWith(before), after: designWith(after) };
}

let stack: CommandStack;
beforeEach(() => {
  stack = createCommandStack();
});

describe('createCommandStack', () => {
  it('빈 스택은 undo/redo가 null이고 can* 플래그가 false다', () => {
    expect(stack.canUndo()).toBe(false);
    expect(stack.canRedo()).toBe(false);
    expect(stack.undo()).toBeNull();
    expect(stack.redo()).toBeNull();
  });

  it('push → undo → redo 순서가 올바른 스냅샷을 반환한다', () => {
    stack.push(colorCommand('#aaa', '#bbb'));
    expect(stack.canUndo()).toBe(true);
    expect(stack.canRedo()).toBe(false);

    // undo는 before로 복원
    expect(stack.undo()?.creamColor).toBe('#aaa');
    expect(stack.canUndo()).toBe(false);
    expect(stack.canRedo()).toBe(true);

    // redo는 after로 복원
    expect(stack.redo()?.creamColor).toBe('#bbb');
    expect(stack.canUndo()).toBe(true);
    expect(stack.canRedo()).toBe(false);
  });

  it('여러 커맨드를 역순으로 되돌리고 다시 실행한다', () => {
    stack.push(colorCommand('#000', '#111'));
    stack.push(colorCommand('#111', '#222'));

    expect(stack.undo()?.creamColor).toBe('#111'); // 두 번째 커맨드의 before
    expect(stack.undo()?.creamColor).toBe('#000'); // 첫 번째 커맨드의 before
    expect(stack.undo()).toBeNull();

    expect(stack.redo()?.creamColor).toBe('#111'); // 첫 번째 after
    expect(stack.redo()?.creamColor).toBe('#222'); // 두 번째 after
  });

  it('undo 후 새 push가 일어나면 redo 스택이 비워진다', () => {
    stack.push(colorCommand('#000', '#111'));
    stack.undo();
    expect(stack.canRedo()).toBe(true);

    stack.push(colorCommand('#000', '#999'));
    expect(stack.canRedo()).toBe(false);
    expect(stack.redo()).toBeNull();
  });

  it('반환 스냅샷은 깊은 복사본이라 변형해도 스택 내부에 영향이 없다', () => {
    stack.push(colorCommand('#aaa', '#bbb'));
    const snap = stack.undo();
    expect(snap).not.toBeNull();
    snap!.creamColor = '#mutated';
    // 같은 커맨드를 다시 redo해도 원래 after가 나온다.
    expect(stack.redo()?.creamColor).toBe('#bbb');
  });

  it('maxDepth 초과 시 가장 오래된 커맨드를 폐기한다', () => {
    const small = createCommandStack(2);
    small.push(colorCommand('#001', '#002')); // 폐기 대상
    small.push(colorCommand('#101', '#102'));
    small.push(colorCommand('#201', '#202'));

    // 깊이 2 → 최근 2개만 남는다.
    expect(small.undo()?.creamColor).toBe('#201');
    expect(small.undo()?.creamColor).toBe('#101');
    expect(small.undo()).toBeNull(); // 가장 오래된 것은 폐기됨
  });

  it('clear는 두 스택을 모두 비운다', () => {
    stack.push(colorCommand('#000', '#111'));
    stack.undo();
    stack.clear();
    expect(stack.canUndo()).toBe(false);
    expect(stack.canRedo()).toBe(false);
  });
});
