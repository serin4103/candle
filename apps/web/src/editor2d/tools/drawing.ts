// editor2d/tools/drawing — 손그림 펜·지우개 계산(ViewModel, 순수, PRD-S1).
// 펜은 포인터 경로를 솎아 점열로 모으고(전개도 좌표), 지우개는 점이 어떤 획에
// 닿았는지 판별한다. 좌표는 전개도(cm) 기준 — 픽셀 저장 금지(좌표 단일화).
// 렌더 기술(Canvas/R3F) 미import.
import type { Point } from '@candle/shared/geometry';

/** 펜 점 샘플링 최소 간격(cm). 이보다 가까운 점은 버려 문서·SVG 비대화를 막는다. */
export const STROKE_MIN_DIST = 0.6;
/** 지우개 기본 여유 반경(cm). 획 두께의 절반에 더해 닿음 판정을 너그럽게. */
export const ERASER_PADDING = 1.5;

/**
 * 진행 중인 획에 점을 덧붙인다(불변). 마지막 점과 STROKE_MIN_DIST 미만이면 무시해
 * 점 수를 줄인다. 첫 점이거나 충분히 멀면 추가한 새 배열을 반환한다.
 */
export function appendStrokePoint(
  points: Point[],
  p: Point,
  minDist: number = STROKE_MIN_DIST,
): Point[] {
  const last = points[points.length - 1];
  if (last && Math.hypot(p.x - last.x, p.y - last.y) < minDist) return points;
  return [...points, p];
}

/** 점 p에서 선분 a–b까지의 최단 거리. */
export function pointToSegmentDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** 점이 한 획(점열) 위에서 radius 이내인지. 점 1개짜리 획은 그 점과의 거리로 본다. */
export function strokeHit(points: Point[], p: Point, radius: number): boolean {
  if (points.length === 0) return false;
  if (points.length === 1) return Math.hypot(p.x - points[0]!.x, p.y - points[0]!.y) <= radius;
  for (let i = 1; i < points.length; i++) {
    if (pointToSegmentDistance(p, points[i - 1]!, points[i]!) <= radius) return true;
  }
  return false;
}

/** 지우개가 닿은 획(드로잉 요소)의 식별자. 여러 개면 zIndex가 가장 위인 것. */
export interface Strokelike {
  id: string;
  points: Point[];
  width: number;
  zIndex: number;
}

/**
 * 점 p에 닿은 획 중 가장 위(zIndex 최대)의 id. 닿음 반경은 획 두께 절반 + padding.
 * 닿은 획이 없으면 null.
 */
export function pickStrokeAt(
  strokes: Strokelike[],
  p: Point,
  padding: number = ERASER_PADDING,
): string | null {
  let top: Strokelike | null = null;
  for (const s of strokes) {
    if (strokeHit(s.points, p, s.width / 2 + padding)) {
      if (!top || s.zIndex > top.zIndex) top = s;
    }
  }
  return top?.id ?? null;
}
