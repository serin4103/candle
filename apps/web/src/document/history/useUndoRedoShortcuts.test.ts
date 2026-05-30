import { describe, it, expect } from 'vitest';
import { matchUndoRedoKey, type KeyChord } from './useUndoRedoShortcuts';

/** 기본값(수식키·shift 없음, 입력 필드 아님)에서 일부만 덮어쓴다. */
function chord(over: Partial<KeyChord>): KeyChord {
  return { key: 'z', metaKey: false, ctrlKey: false, shiftKey: false, editableTarget: false, ...over };
}

describe('matchUndoRedoKey', () => {
  it('Cmd+Z / Ctrl+Z → undo', () => {
    expect(matchUndoRedoKey(chord({ metaKey: true }))).toBe('undo');
    expect(matchUndoRedoKey(chord({ ctrlKey: true }))).toBe('undo');
  });

  it('Cmd/Ctrl+Shift+Z → redo', () => {
    expect(matchUndoRedoKey(chord({ metaKey: true, shiftKey: true }))).toBe('redo');
    expect(matchUndoRedoKey(chord({ ctrlKey: true, shiftKey: true }))).toBe('redo');
  });

  it('Ctrl+Y → redo', () => {
    expect(matchUndoRedoKey(chord({ ctrlKey: true, key: 'y' }))).toBe('redo');
  });

  it('대문자 키(Shift로 인한 Z)도 동일하게 판정', () => {
    expect(matchUndoRedoKey(chord({ metaKey: true, key: 'Z' }))).toBe('undo');
    expect(matchUndoRedoKey(chord({ ctrlKey: true, key: 'Y' }))).toBe('redo');
  });

  it('수식키 없으면 무시', () => {
    expect(matchUndoRedoKey(chord({ key: 'z' }))).toBeNull();
    expect(matchUndoRedoKey(chord({ key: 'y' }))).toBeNull();
  });

  it('입력 필드 포커스 중이면 무시(텍스트 편집 기본 undo 보존)', () => {
    expect(matchUndoRedoKey(chord({ metaKey: true, editableTarget: true }))).toBeNull();
    expect(matchUndoRedoKey(chord({ ctrlKey: true, shiftKey: true, editableTarget: true }))).toBeNull();
  });

  it('관련 없는 키는 무시', () => {
    expect(matchUndoRedoKey(chord({ metaKey: true, key: 'a' }))).toBeNull();
  });
});
