import { describe, it, expect, beforeEach } from 'vitest';
import { validateDesign } from '@candle/shared';
import { useDesignStore, type ElementInput } from './designStore';
import { createDefaultDesign } from './defaultDesign';

const letteringInput: ElementInput = {
  type: 'lettering',
  transform: { x: 0, y: 0, scale: 1, rotation: 0 },
  text: 'Hi',
  font: 'serif',
  color: '#000',
};

const illustrationInput: ElementInput = {
  type: 'illustration',
  transform: { x: 0, y: 0, scale: 1, rotation: 0 },
  assetId: 'a1',
};

beforeEach(() => {
  useDesignStore.setState({
    design: createDefaultDesign(),
    selectedId: null,
    viewport: { panX: 0, panY: 0, zoom: 1 },
  });
});

describe('createDefaultDesign', () => {
  it('검증을 통과하는 기본 문서를 만든다', () => {
    expect(() => validateDesign(createDefaultDesign())).not.toThrow();
  });
});

describe('시트 액션', () => {
  it('setShape / setBaseColor / setCreamColor', () => {
    const s = useDesignStore.getState();
    s.setShape('heart');
    s.setBaseColor('#abc');
    s.setCreamColor('#def');
    const d = useDesignStore.getState().design;
    expect(d.shape).toBe('heart');
    expect(d.baseColor).toBe('#abc');
    expect(d.creamColor).toBe('#def');
  });
});

describe('addElement', () => {
  it('id를 생성하고 zIndex를 0부터 자동 부여한다', () => {
    const { addElement } = useDesignStore.getState();
    const id1 = addElement(letteringInput);
    const id2 = addElement(illustrationInput);
    const { elements } = useDesignStore.getState().design;
    expect(elements).toHaveLength(2);
    expect(id1).not.toBe(id2);
    expect(elements[0]!.zIndex).toBe(0);
    expect(elements[1]!.zIndex).toBe(1);
  });

  it('잘못된 입력은 검증에서 거부한다', () => {
    const { addElement } = useDesignStore.getState();
    expect(() =>
      addElement({
        type: 'lettering',
        transform: { x: 0, y: 0, scale: -1, rotation: 0 },
        text: 'x',
        font: 'serif',
        color: '#000',
      }),
    ).toThrow();
  });
});

describe('요소 변환 액션', () => {
  it('move / scale / rotate는 해당 요소 transform만 바꾼다', () => {
    const { addElement, moveElement, scaleElement, rotateElement } =
      useDesignStore.getState();
    const id = addElement(letteringInput);
    moveElement(id, { x: 10, y: 20 });
    scaleElement(id, 2);
    rotateElement(id, Math.PI);
    const el = useDesignStore.getState().design.elements[0]!;
    expect(el.transform).toEqual({ x: 10, y: 20, scale: 2, rotation: Math.PI });
  });
});

describe('deleteElement', () => {
  it('요소를 제거하고 선택 상태를 정리한다', () => {
    const { addElement, select, deleteElement } = useDesignStore.getState();
    const id = addElement(letteringInput);
    select(id);
    deleteElement(id);
    const st = useDesignStore.getState();
    expect(st.design.elements).toHaveLength(0);
    expect(st.selectedId).toBeNull();
  });
});

describe('reorderElement', () => {
  it('zIndex를 변경한다', () => {
    const { addElement, reorderElement } = useDesignStore.getState();
    const id = addElement(letteringInput);
    reorderElement(id, 99);
    expect(useDesignStore.getState().design.elements[0]!.zIndex).toBe(99);
  });
});

describe('updateLettering', () => {
  it('레터링 요소의 텍스트·폰트·색상을 바꾼다', () => {
    const { addElement, updateLettering } = useDesignStore.getState();
    const id = addElement(letteringInput);
    updateLettering(id, { text: 'Bye', font: 'sans', color: '#f00' });
    const el = useDesignStore.getState().design.elements[0]!;
    expect(el.type).toBe('lettering');
    if (el.type === 'lettering') {
      expect(el).toMatchObject({ text: 'Bye', font: 'sans', color: '#f00' });
    }
  });

  it('레터링이 아닌 요소에는 영향이 없다', () => {
    const { addElement, updateLettering } = useDesignStore.getState();
    const id = addElement(illustrationInput);
    updateLettering(id, { text: 'x' });
    const el = useDesignStore.getState().design.elements[0]!;
    expect(el.type).toBe('illustration');
    expect('text' in el).toBe(false);
  });
});

describe('select / setViewport', () => {
  it('선택·뷰포트 표현 상태를 갱신한다', () => {
    const { select, setViewport } = useDesignStore.getState();
    select('abc');
    setViewport({ panX: 5, panY: 6, zoom: 3 });
    const st = useDesignStore.getState();
    expect(st.selectedId).toBe('abc');
    expect(st.viewport).toEqual({ panX: 5, panY: 6, zoom: 3 });
  });
});

describe('loadDesign / getDesignSnapshot', () => {
  it('외부 문서를 검증 후 적재한다', () => {
    const incoming = { ...createDefaultDesign(), shape: 'square' as const };
    useDesignStore.getState().loadDesign(incoming);
    expect(useDesignStore.getState().design.shape).toBe('square');
  });

  it('잘못된 문서 로드는 거부한다', () => {
    expect(() => useDesignStore.getState().loadDesign({ foo: 1 })).toThrow();
  });

  it('스냅샷은 깊은 복사본 — 수정해도 스토어에 영향 없다', () => {
    const { addElement, getDesignSnapshot } = useDesignStore.getState();
    addElement(letteringInput);
    const snap = getDesignSnapshot();
    snap.elements[0]!.transform.x = 999;
    expect(useDesignStore.getState().design.elements[0]!.transform.x).toBe(0);
  });
});

describe('손그림 (PRD-S1)', () => {
  beforeEach(() => {
    useDesignStore.setState({ pendingPiping: null, drawingTool: null });
  });

  it('addDrawing은 전개도 좌표 점열·항등 transform의 drawing 요소를 추가한다', () => {
    const points = [
      { x: 10, y: 20 },
      { x: 12, y: 25 },
    ];
    const id = useDesignStore.getState().addDrawing(points, '#123456', 3);
    const el = useDesignStore.getState().design.elements.find((e) => e.id === id);
    expect(el?.type).toBe('drawing');
    if (el?.type === 'drawing') {
      expect(el.points).toEqual(points); // 좌표 보존(전개도 좌표 그대로)
      expect(el.color).toBe('#123456');
      expect(el.width).toBe(3);
      expect(el.transform).toEqual({ x: 0, y: 0, scale: 1, rotation: 0 });
    }
  });

  it('추가한 손그림 1획을 deleteElement로 지운다(획 단위 지우개)', () => {
    const id = useDesignStore.getState().addDrawing([{ x: 0, y: 0 }], '#000', 2);
    expect(useDesignStore.getState().design.elements).toHaveLength(1);
    useDesignStore.getState().deleteElement(id);
    expect(useDesignStore.getState().design.elements).toHaveLength(0);
  });

  it('손그림 모드와 파이핑 모드는 상호배타다', () => {
    const s = useDesignStore.getState();
    s.setPendingPiping({ variant: 'dots', color: '#fff' });
    s.setDrawingTool('pen');
    expect(useDesignStore.getState().pendingPiping).toBeNull(); // 펜 켜면 파이핑 해제
    expect(useDesignStore.getState().drawingTool).toBe('pen');

    s.setPendingPiping({ variant: 'dots', color: '#fff' });
    expect(useDesignStore.getState().drawingTool).toBeNull(); // 파이핑 켜면 펜 해제
  });

  it('setDrawingTool(tool)은 선택을 해제한다', () => {
    useDesignStore.getState().select('something');
    useDesignStore.getState().setDrawingTool('eraser');
    expect(useDesignStore.getState().selectedId).toBeNull();
  });

  it('setBrush는 일부 필드만 갱신한다', () => {
    useDesignStore.getState().setBrush({ width: 5 });
    expect(useDesignStore.getState().brush.width).toBe(5);
    useDesignStore.getState().setBrush({ color: '#abcdef' });
    expect(useDesignStore.getState().brush).toMatchObject({ width: 5, color: '#abcdef' });
  });
});
