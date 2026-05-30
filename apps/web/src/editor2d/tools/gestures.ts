// editor2d/tools/gestures — 드래그 제스처 계산(ViewModel, 순수).
// 시작 시점의 transform·피벗을 스냅샷으로 들고, 포인터 위치에 따라 적용할
// transform 패치를 계산한다. 결과는 canvas가 store 액션으로 반영한다.
// 좌표/회전 수학은 shared/geometry로 위임. 렌더 기술 미import.
import type { Transform } from '@candle/shared';
import type { Point } from '@candle/shared/geometry';
import { cornerPoint, edgeMidPoint, type Corner, type Side, type Size } from './handles';

/** 적용할 transform 부분 패치. */
export interface TransformPatch {
  x?: number;
  y?: number;
  scale?: number;
  rotation?: number;
  /** 파이핑 런 길이(cm) — 수평 확장 핸들 드래그로 개수 증감. */
  length?: number;
}

/** 스케일 하한(스키마는 scale>0을 요구). */
const MIN_SCALE_FACTOR = 0.05;

/** 이동 제스처 — 잡은 지점과 중심의 오프셋을 고정한다. */
export interface MoveGesture {
  kind: 'move';
  grabOffset: Point;
}

/** 대각 스케일 제스처 — 반대 코너(pivot)를 고정하고 등비 스케일. */
export interface ScaleGesture {
  kind: 'scale';
  startScale: number;
  pivot: Point;
  /** 시작 시 (잡은 코너 − pivot) 벡터. */
  d0: Point;
  /** |d0|. */
  len0: number;
}

/** 회전 제스처 — 중심을 축으로 포인터 방향에 맞춘다. */
export interface RotateGesture {
  kind: 'rotate';
  center: Point;
}

/**
 * 파이핑 수평 확장 제스처 — 반대편 변 중점(pivot)을 고정하고 파이핑 방향으로
 * 런 길이만 바꾼다(스케일 불변). 길이가 늘면 모티프 개수가 늘어난다.
 */
export interface LengthGesture {
  kind: 'length';
  /** 고정점(반대편 변 중점). */
  pivot: Point;
  /** pivot→잡은 변 방향 단위 벡터(파이핑 축). */
  axis: Point;
  /** 시작 스케일(축소/확대된 좌표를 unscaled length로 환산). */
  startScale: number;
  /** 최소 런 길이(cm, unscaled). */
  minLength: number;
}

export type Gesture = MoveGesture | ScaleGesture | RotateGesture | LengthGesture;

/** 이동 시작 — 포인터와 중심의 오프셋 기록. */
export function beginMove(transform: Transform, pointer: Point): MoveGesture {
  return {
    kind: 'move',
    grabOffset: { x: pointer.x - transform.x, y: pointer.y - transform.y },
  };
}

/** 대각 스케일 시작 — 잡은 코너의 반대 코너를 고정점으로. */
export function beginScale(
  transform: Transform,
  size: Size,
  corner: Corner,
): ScaleGesture {
  const opposite: Corner = OPPOSITE[corner];
  const pivot = cornerPoint(transform, size, opposite);
  const grabbed = cornerPoint(transform, size, corner);
  const d0 = { x: grabbed.x - pivot.x, y: grabbed.y - pivot.y };
  return {
    kind: 'scale',
    startScale: transform.scale,
    pivot,
    d0,
    len0: Math.hypot(d0.x, d0.y) || 1,
  };
}

/** 회전 시작 — 중심 기록. */
export function beginRotate(transform: Transform): RotateGesture {
  return { kind: 'rotate', center: { x: transform.x, y: transform.y } };
}

/** 파이핑 수평 확장 시작 — 잡은 변의 반대편 변을 고정점으로, 축 방향 기록. */
export function beginLength(
  transform: Transform,
  size: Size,
  side: Side,
  minLength: number,
): LengthGesture {
  const opposite: Side = side === 'e' ? 'w' : 'e';
  const pivot = edgeMidPoint(transform, size, opposite);
  const grabbed = edgeMidPoint(transform, size, side);
  const dx = grabbed.x - pivot.x;
  const dy = grabbed.y - pivot.y;
  const len = Math.hypot(dx, dy) || 1;
  return {
    kind: 'length',
    pivot,
    axis: { x: dx / len, y: dy / len },
    startScale: transform.scale || 1,
    minLength,
  };
}

const OPPOSITE: Record<Corner, Corner> = {
  nw: 'se',
  ne: 'sw',
  se: 'nw',
  sw: 'ne',
};

/** 포인터 위치로부터 적용할 transform 패치를 계산한다. */
export function applyGesture(g: Gesture, pointer: Point): TransformPatch {
  if (g.kind === 'move') {
    return { x: pointer.x - g.grabOffset.x, y: pointer.y - g.grabOffset.y };
  }
  if (g.kind === 'rotate') {
    const dx = pointer.x - g.center.x;
    const dy = pointer.y - g.center.y;
    // 회전 핸들은 로컬 위(-y). 포인터 방향에 +90°를 더해 정렬.
    return { rotation: Math.atan2(dy, dx) + Math.PI / 2 };
  }
  if (g.kind === 'length') {
    // pivot→pointer를 파이핑 축에 투영 → 새 런 길이(스케일 적용 좌표).
    const projScaled = (pointer.x - g.pivot.x) * g.axis.x + (pointer.y - g.pivot.y) * g.axis.y;
    const length = Math.max(g.minLength, projScaled / g.startScale);
    const scaledLen = length * g.startScale;
    // pivot은 고정, 중심 = pivot + 축·(길이/2).
    return {
      length,
      x: g.pivot.x + (g.axis.x * scaledLen) / 2,
      y: g.pivot.y + (g.axis.y * scaledLen) / 2,
    };
  }
  // scale — pivot 고정 등비. 잡은 코너가 포인터를 따라가도록.
  const u = { x: g.d0.x / g.len0, y: g.d0.y / g.len0 };
  const proj = (pointer.x - g.pivot.x) * u.x + (pointer.y - g.pivot.y) * u.y;
  const f = Math.max(MIN_SCALE_FACTOR, proj / g.len0);
  const scale = g.startScale * f;
  // 새 중심 = pivot + (d0 · f)/2 (잡은 코너와 고정 pivot의 중점).
  return {
    scale,
    x: g.pivot.x + (g.d0.x * f) / 2,
    y: g.pivot.y + (g.d0.y * f) / 2,
  };
}
