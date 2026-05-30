// editor2d/tools/handles — 선택 핸들 배치·히트테스트(ViewModel, 순수).
// 좌표/회전 수학은 shared/geometry로 위임한다. 렌더 기술(Canvas/R3F) 미import.
import type { Transform } from '@candle/shared';
import type { Point } from '@candle/shared/geometry';
import { applyForwardRotation, applyInverseRotation } from '@candle/shared/geometry';

/** 요소 로컬 크기(스케일 1, cm). */
export interface Size {
  width: number;
  height: number;
}

/** 코너 스케일 핸들 식별자(전개도 방위). */
export type Corner = 'nw' | 'ne' | 'se' | 'sw';
export const CORNERS: Corner[] = ['nw', 'ne', 'se', 'sw'];

/** 코너별 로컬 부호(중심 기준). */
const CORNER_SIGN: Record<Corner, { sx: number; sy: number }> = {
  nw: { sx: -1, sy: -1 },
  ne: { sx: 1, sy: -1 },
  se: { sx: 1, sy: 1 },
  sw: { sx: -1, sy: 1 },
};

/** 회전 핸들을 박스 위로 띄우는 여백(cm). */
export const ROTATE_OFFSET = 8;

/** 스케일 적용 후 반쪽 폭·높이(cm). */
export function halfExtents(size: Size, scale: number): { hx: number; hy: number } {
  return { hx: (size.width * scale) / 2, hy: (size.height * scale) / 2 };
}

/** 한 코너의 전개도 좌표. */
export function cornerPoint(transform: Transform, size: Size, corner: Corner): Point {
  const { hx, hy } = halfExtents(size, transform.scale);
  const { sx, sy } = CORNER_SIGN[corner];
  return applyForwardRotation(transform, { x: sx * hx, y: sy * hy });
}

/**
 * 선택 핸들 배치 — 4코너 + 회전 핸들(전개도 좌표).
 * rotateOffset(cm)은 박스 위로 회전 핸들을 띄우는 거리 — 화면 일정 크기를 위해
 * View가 렌더 스케일에 맞춰 넘긴다(기본값은 cm 고정).
 */
export function handlePositions(
  transform: Transform,
  size: Size,
  rotateOffset: number = ROTATE_OFFSET,
): { corners: Record<Corner, Point>; rotate: Point } {
  const { hy } = halfExtents(size, transform.scale);
  const corners = {
    nw: cornerPoint(transform, size, 'nw'),
    ne: cornerPoint(transform, size, 'ne'),
    se: cornerPoint(transform, size, 'se'),
    sw: cornerPoint(transform, size, 'sw'),
  };
  const rotate = applyForwardRotation(transform, { x: 0, y: -hy - rotateOffset });
  return { corners, rotate };
}

/** 요소 박스(회전 포함) 안에 점이 있는지. */
export function hitTestElement(transform: Transform, size: Size, point: Point): boolean {
  const local = applyInverseRotation(transform, point);
  const { hx, hy } = halfExtents(size, transform.scale);
  return Math.abs(local.x) <= hx && Math.abs(local.y) <= hy;
}

/** 히트테스트 대상 요소(전개도 좌표 + 크기 + zIndex). */
export interface Pickable {
  id: string;
  transform: Transform;
  size: Size;
  zIndex: number;
}

/** 점을 맞춘 요소 중 zIndex가 가장 높은(위) 것의 id. 없으면 null. */
export function pickTopElement(items: Pickable[], point: Point): string | null {
  let top: Pickable | null = null;
  for (const it of items) {
    if (hitTestElement(it.transform, it.size, point)) {
      if (!top || it.zIndex > top.zIndex) top = it;
    }
  }
  return top?.id ?? null;
}
