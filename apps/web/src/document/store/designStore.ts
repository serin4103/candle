// document/store — 디자인 문서의 진실의 원천(Single Source of Truth).
// 모든 View가 이 스토어를 구독하고, 상태 변경은 액션을 통해서만 일어난다.
// 규칙(CLAUDE.md): 렌더 기술(three/r3f/canvas) import 금지. 좌표 계산은
// shared/geometry 순수 함수로 위임한다(연속 제스처 계산은 editor2d/tools 담당).
import { create } from 'zustand';
import {
  validateDesign,
  validateElement,
  type Design,
  type Element,
  type Shape,
} from '@candle/shared';
import type { Point, Viewport } from '@candle/shared/geometry';
import { createDefaultDesign } from './defaultDesign';

/** id·zIndex 없이 추가할 요소 입력. zIndex는 생략 시 자동 부여. */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
export type ElementInput = DistributiveOmit<Element, 'id' | 'zIndex'> & {
  zIndex?: number;
};

/** 레터링 변경 가능한 필드. */
export type LetteringPatch = Partial<Pick<Extract<Element, { type: 'lettering' }>, 'text' | 'font' | 'color'>>;

/** 파이핑 변경 가능한 필드(색상·굵기·런 길이). length는 수평 확장 핸들이 갱신. */
export type PipingPatch = Partial<
  Pick<Extract<Element, { type: 'piping' }>, 'color' | 'width' | 'length'>
>;

/** 파이핑 그리기 모드 설정(모양·색상·굵기). */
export interface PendingPiping {
  variant: string;
  color: string;
  width: number;
}

/** 일러스트 변경 가능한 필드(색상 교체). */
export type IllustrationPatch = Partial<Pick<Extract<Element, { type: 'illustration' }>, 'colors'>>;

/** 손그림 도구 모드 (PRD-S1). null이면 일반 편집. */
export type DrawingTool = 'pen' | 'eraser' | null;

/** 펜 브러시 설정 (PRD-S1). 색상과 굵기(전개도 cm). */
export interface Brush {
  color: string;
  width: number;
}

/** 파이핑 추가 패널의 색상·굵기 설정(모양 선택과 별개로 유지). */
export interface PipingBrush {
  color: string;
  width: number;
}

/** 기본 뷰포트(원점·1배). */
const DEFAULT_VIEWPORT: Viewport = { panX: 0, panY: 0, zoom: 1 };

/** 기본 브러시 — 크림 위에서 잘 보이는 진한 갈색, 적당한 굵기(cm). */
const DEFAULT_BRUSH: Brush = { color: '#5a3b3b', width: 2 };

/** 기본 파이핑 설정 — 파스텔 핑크, 기본 굵기(cm). (catalog DEFAULT_PIPING_WIDTH와 일치) */
const DEFAULT_PIPING_BRUSH: PipingBrush = { color: '#ef9aae', width: 7 };

export interface DesignState {
  /** 현재 디자인 문서. */
  design: Design;
  /** 선택된 요소 id. */
  selectedId: string | null;
  /** 전개도 캔버스 뷰포트(팬/줌). */
  viewport: Viewport;
  /**
   * 파이핑 그리기 모드. 활성이면 캔버스 드래그가 파이핑 런을 그린다(선택/이동 대신).
   * null이면 일반 편집 모드. (표현/도구 상태)
   */
  pendingPiping: PendingPiping | null;
  /**
   * 손그림 도구 모드 (PRD-S1). 'pen'이면 드래그가 획을 그리고, 'eraser'면 드래그가
   * 닿은 획을 지운다. null이면 일반 편집. pendingPiping과 상호배타.
   */
  drawingTool: DrawingTool;
  /** 펜 브러시(색상·굵기). */
  brush: Brush;
  /** 파이핑 추가 패널의 색상·굵기(모양과 별개로 유지). */
  pipingBrush: PipingBrush;

  // ── 시트(케이크) ──
  setShape: (shape: Shape) => void;
  setBaseColor: (color: string) => void;
  setCreamColor: (color: string) => void;

  // ── 요소 ──
  /** 요소 추가. id 생성·zIndex 자동 부여 후 추가한 요소의 id 반환. */
  addElement: (input: ElementInput) => string;
  moveElement: (id: string, position: { x: number; y: number }) => void;
  scaleElement: (id: string, scale: number) => void;
  rotateElement: (id: string, rotation: number) => void;
  deleteElement: (id: string) => void;
  /** 레이어 순서(zIndex) 변경. */
  reorderElement: (id: string, zIndex: number) => void;
  /** 레터링 텍스트·폰트·색상 변경. */
  updateLettering: (id: string, patch: LetteringPatch) => void;
  /** 파이핑 색상 변경. */
  updatePiping: (id: string, patch: PipingPatch) => void;
  /** 일러스트 색상 교체. */
  updateIllustration: (id: string, patch: IllustrationPatch) => void;
  /** 손그림 1획 추가(PRD-S1). 점열은 전개도 절대 좌표, transform은 항등. 추가한 id 반환. */
  addDrawing: (points: Point[], color: string, width: number) => string;

  // ── 표현 상태 ──
  select: (id: string | null) => void;
  setViewport: (viewport: Viewport) => void;
  /** 파이핑 그리기 모드 설정/해제(설정 시 손그림 모드 해제). */
  setPendingPiping: (pending: PendingPiping | null) => void;
  /** 손그림 도구 모드 설정/해제(설정 시 파이핑 모드·선택 해제). */
  setDrawingTool: (tool: DrawingTool) => void;
  /** 브러시 일부 변경(색상·굵기). */
  setBrush: (patch: Partial<Brush>) => void;
  /** 파이핑 설정 일부 변경(색상·굵기). 그리기 모드가 켜져 있으면 그 모드에도 반영. */
  setPipingBrush: (patch: Partial<PipingBrush>) => void;

  // ── 문서 로드/스냅샷 ──
  /** 외부 디자인 문서를 검증 후 적재. */
  loadDesign: (design: unknown) => void;
  /** 현재 문서의 검증된 깊은 복사본 반환(저장·공유용). */
  getDesignSnapshot: () => Design;
}

/** 요소 배열에서 가장 큰 zIndex + 1 (없으면 0). */
function nextZIndex(elements: Element[]): number {
  return elements.reduce((max, el) => Math.max(max, el.zIndex), -1) + 1;
}

/** id로 요소를 변환해 새 elements 배열을 반환(불변 갱신). */
function mapElement(
  elements: Element[],
  id: string,
  fn: (el: Element) => Element,
): Element[] {
  return elements.map((el) => (el.id === id ? fn(el) : el));
}

export const useDesignStore = create<DesignState>((set, get) => ({
  design: createDefaultDesign(),
  selectedId: null,
  viewport: { ...DEFAULT_VIEWPORT },
  pendingPiping: null,
  drawingTool: null,
  brush: { ...DEFAULT_BRUSH },
  pipingBrush: { ...DEFAULT_PIPING_BRUSH },

  setShape: (shape) =>
    set((s) => ({ design: { ...s.design, shape } })),

  setBaseColor: (color) =>
    set((s) => ({ design: { ...s.design, baseColor: color } })),

  setCreamColor: (color) =>
    set((s) => ({ design: { ...s.design, creamColor: color } })),

  addElement: (input) => {
    const id = crypto.randomUUID();
    const { design } = get();
    const element = validateElement({
      ...input,
      id,
      zIndex: input.zIndex ?? nextZIndex(design.elements),
    });
    set((s) => ({
      design: { ...s.design, elements: [...s.design.elements, element] },
    }));
    return id;
  },

  moveElement: (id, position) =>
    set((s) => ({
      design: {
        ...s.design,
        elements: mapElement(s.design.elements, id, (el) => ({
          ...el,
          transform: { ...el.transform, x: position.x, y: position.y },
        })),
      },
    })),

  scaleElement: (id, scale) =>
    set((s) => ({
      design: {
        ...s.design,
        elements: mapElement(s.design.elements, id, (el) => ({
          ...el,
          transform: { ...el.transform, scale },
        })),
      },
    })),

  rotateElement: (id, rotation) =>
    set((s) => ({
      design: {
        ...s.design,
        elements: mapElement(s.design.elements, id, (el) => ({
          ...el,
          transform: { ...el.transform, rotation },
        })),
      },
    })),

  deleteElement: (id) =>
    set((s) => ({
      design: {
        ...s.design,
        elements: s.design.elements.filter((el) => el.id !== id),
      },
      selectedId: s.selectedId === id ? null : s.selectedId,
    })),

  reorderElement: (id, zIndex) =>
    set((s) => ({
      design: {
        ...s.design,
        elements: mapElement(s.design.elements, id, (el) => ({ ...el, zIndex })),
      },
    })),

  updateLettering: (id, patch) =>
    set((s) => ({
      design: {
        ...s.design,
        elements: mapElement(s.design.elements, id, (el) =>
          el.type === 'lettering' ? { ...el, ...patch } : el,
        ),
      },
    })),

  updatePiping: (id, patch) =>
    set((s) => ({
      design: {
        ...s.design,
        elements: mapElement(s.design.elements, id, (el) =>
          el.type === 'piping' ? { ...el, ...patch } : el,
        ),
      },
    })),

  updateIllustration: (id, patch) =>
    set((s) => ({
      design: {
        ...s.design,
        elements: mapElement(s.design.elements, id, (el) =>
          el.type === 'illustration' ? { ...el, ...patch } : el,
        ),
      },
    })),

  addDrawing: (points, color, width) =>
    get().addElement({
      type: 'drawing',
      points: points.map((p) => ({ x: p.x, y: p.y })),
      color,
      width,
      transform: { x: 0, y: 0, scale: 1, rotation: 0 },
    }),

  select: (id) => set({ selectedId: id }),

  setViewport: (viewport) => set({ viewport }),

  // 모드 상호배타: 파이핑을 켜면 손그림 모드를 끈다(끌 때는 손그림 상태 유지).
  setPendingPiping: (pending) =>
    set((s) => ({ pendingPiping: pending, drawingTool: pending ? null : s.drawingTool })),

  // 모드 상호배타: 손그림을 켜면 파이핑·선택을 끈다.
  setDrawingTool: (tool) =>
    set((s) => ({
      drawingTool: tool,
      pendingPiping: tool ? null : s.pendingPiping,
      selectedId: tool ? null : s.selectedId,
    })),

  setBrush: (patch) => set((s) => ({ brush: { ...s.brush, ...patch } })),

  // 파이핑 설정 변경 — 그리기 모드가 활성이면 그 모드(pendingPiping)에도 즉시 반영.
  setPipingBrush: (patch) =>
    set((s) => ({
      pipingBrush: { ...s.pipingBrush, ...patch },
      pendingPiping: s.pendingPiping ? { ...s.pendingPiping, ...patch } : s.pendingPiping,
    })),

  loadDesign: (design) =>
    set({ design: validateDesign(design), selectedId: null, pendingPiping: null, drawingTool: null }),

  getDesignSnapshot: () => structuredClone(validateDesign(get().design)),
}));
