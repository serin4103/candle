import { describe, it, expect, beforeEach } from 'vitest';
import { useDesignStore, type ElementInput } from './designStore';
import { createDefaultDesign } from './defaultDesign';

const illustrationInput: ElementInput = {
  type: 'illustration',
  transform: { x: 0, y: 0, scale: 1, rotation: 0 },
  assetId: 'a1',
};

// loadDesign으로 문서·히스토리를 함께 초기화한다(스택 clear 포함).
beforeEach(() => {
  useDesignStore.getState().loadDesign(createDefaultDesign());
  useDesignStore.setState({ viewport: { panX: 0, panY: 0, zoom: 1 } });
});

describe('히스토리 — 이산 동작 자동 커밋', () => {
  it('초기 상태는 undo/redo 불가', () => {
    const s = useDesignStore.getState();
    expect(s.canUndo).toBe(false);
    expect(s.canRedo).toBe(false);
  });

  it('요소 추가 → undo 1회로 직전 디자인 복원, redo로 재적용', () => {
    const s = useDesignStore.getState();
    expect(s.design.elements).toHaveLength(0);
    s.addElement(illustrationInput);
    expect(useDesignStore.getState().design.elements).toHaveLength(1);
    expect(useDesignStore.getState().canUndo).toBe(true);

    useDesignStore.getState().undo();
    expect(useDesignStore.getState().design.elements).toHaveLength(0);
    expect(useDesignStore.getState().canRedo).toBe(true);

    useDesignStore.getState().redo();
    expect(useDesignStore.getState().design.elements).toHaveLength(1);
  });

  it('색상 변경 → undo로 이전 색 복원', () => {
    const before = useDesignStore.getState().design.creamColor;
    useDesignStore.getState().setCreamColor('#123456');
    expect(useDesignStore.getState().design.creamColor).toBe('#123456');
    useDesignStore.getState().undo();
    expect(useDesignStore.getState().design.creamColor).toBe(before);
  });

  it('같은 값으로 바꾸면(no-op) 커맨드가 쌓이지 않는다', () => {
    const same = useDesignStore.getState().design.creamColor;
    useDesignStore.getState().setCreamColor(same);
    expect(useDesignStore.getState().canUndo).toBe(false);
  });

  it('새 동작은 redo 분기를 폐기한다', () => {
    const s = useDesignStore.getState();
    s.addElement(illustrationInput);
    useDesignStore.getState().undo();
    expect(useDesignStore.getState().canRedo).toBe(true);
    useDesignStore.getState().addElement(illustrationInput);
    expect(useDesignStore.getState().canRedo).toBe(false);
  });
});

describe('히스토리 — 트랜잭션(연속 제스처) 1커밋', () => {
  it('드래그 이동(move N회) → undo 1회로 드래그 전체가 되돌려진다', () => {
    const s = useDesignStore.getState();
    const id = s.addElement(illustrationInput); // 커맨드 1
    const start = useDesignStore.getState().design.elements[0]!.transform;
    expect(start.x).toBe(0);

    // 드래그: begin → move 여러 번 → commit (커맨드 1건)
    useDesignStore.getState().beginTransaction();
    useDesignStore.getState().moveElement(id, { x: 1, y: 1 });
    useDesignStore.getState().moveElement(id, { x: 2, y: 2 });
    useDesignStore.getState().moveElement(id, { x: 3, y: 3 });
    useDesignStore.getState().commitTransaction('요소 이동');
    expect(useDesignStore.getState().design.elements[0]!.transform.x).toBe(3);

    // 한 번의 undo로 드래그 시작 위치(0,0)로 복귀
    useDesignStore.getState().undo();
    const t = useDesignStore.getState().design.elements[0]!.transform;
    expect(t.x).toBe(0);
    expect(t.y).toBe(0);

    // 추가 undo로 요소 자체 제거(커맨드 1까지 되돌림)
    useDesignStore.getState().undo();
    expect(useDesignStore.getState().design.elements).toHaveLength(0);
  });

  it('변화 없는 트랜잭션은 커맨드를 만들지 않는다', () => {
    const id = useDesignStore.getState().addElement(illustrationInput);
    expect(useDesignStore.getState().canUndo).toBe(true); // addElement 커맨드 1건

    // 같은 위치로 이동(no-op)하는 트랜잭션 → 커맨드 추가 없음.
    useDesignStore.getState().beginTransaction();
    useDesignStore.getState().moveElement(id, { x: 0, y: 0 });
    useDesignStore.getState().commitTransaction('요소 이동');

    // addElement 커맨드 1건만 존재 → undo 1회로 요소 제거되고 더 되돌릴 것 없음.
    useDesignStore.getState().undo();
    expect(useDesignStore.getState().design.elements).toHaveLength(0);
    expect(useDesignStore.getState().canUndo).toBe(false);
  });

  it('트랜잭션 중에는 이산 자동 커밋이 보류되어 1커밋으로 묶인다(연속 지우개 모사)', () => {
    const s = useDesignStore.getState();
    const a = s.addElement(illustrationInput);
    const b = s.addElement(illustrationInput);
    expect(useDesignStore.getState().design.elements).toHaveLength(2);

    // 지우개 드래그: begin → delete 여러 번 → commit
    useDesignStore.getState().beginTransaction();
    useDesignStore.getState().deleteElement(a);
    useDesignStore.getState().deleteElement(b);
    useDesignStore.getState().commitTransaction('획 지우기');
    expect(useDesignStore.getState().design.elements).toHaveLength(0);

    // 한 번의 undo로 두 요소가 모두 복원된다.
    useDesignStore.getState().undo();
    expect(useDesignStore.getState().design.elements).toHaveLength(2);
  });
});

describe('히스토리 — 표현 상태 제외 / 로드 초기화 / 선택 정리', () => {
  it('select·setViewport·setDrawingTool·setBrush는 히스토리를 만들지 않는다', () => {
    const s = useDesignStore.getState();
    s.select('x');
    s.setViewport({ panX: 5, panY: 5, zoom: 2 });
    s.setDrawingTool('pen');
    s.setBrush({ width: 0.9 });
    s.setPendingPiping({ variant: 'v', color: '#000' });
    expect(useDesignStore.getState().canUndo).toBe(false);
  });

  it('loadDesign은 히스토리를 초기화한다', () => {
    const s = useDesignStore.getState();
    s.addElement(illustrationInput);
    expect(useDesignStore.getState().canUndo).toBe(true);
    useDesignStore.getState().loadDesign(createDefaultDesign());
    expect(useDesignStore.getState().canUndo).toBe(false);
    expect(useDesignStore.getState().canRedo).toBe(false);
  });

  it('undo로 선택 요소가 사라지면 selectedId=null, viewport는 불변', () => {
    const s = useDesignStore.getState();
    const id = s.addElement(illustrationInput);
    s.select(id);
    s.setViewport({ panX: 9, panY: 9, zoom: 3 });
    useDesignStore.getState().undo(); // 요소 제거
    expect(useDesignStore.getState().selectedId).toBeNull();
    expect(useDesignStore.getState().viewport).toEqual({ panX: 9, panY: 9, zoom: 3 });
  });
});
