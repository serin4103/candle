import { describe, it, expect } from 'vitest';
import {
  appendStrokePoint,
  pointToSegmentDistance,
  strokeHit,
  pickStrokeAt,
  STROKE_MIN_DIST,
  type Strokelike,
} from './drawing';

describe('appendStrokePoint', () => {
  it('첫 점은 항상 추가한다', () => {
    expect(appendStrokePoint([], { x: 1, y: 2 })).toEqual([{ x: 1, y: 2 }]);
  });

  it('마지막 점과 최소 간격 미만이면 무시(같은 배열 반환)한다', () => {
    const pts = [{ x: 0, y: 0 }];
    const next = appendStrokePoint(pts, { x: STROKE_MIN_DIST / 2, y: 0 });
    expect(next).toBe(pts); // 동일 참조 — 추가 안 됨
  });

  it('최소 간격 이상이면 추가한다', () => {
    const pts = [{ x: 0, y: 0 }];
    const next = appendStrokePoint(pts, { x: STROKE_MIN_DIST * 2, y: 0 });
    expect(next).toHaveLength(2);
    expect(next).not.toBe(pts);
  });
});

describe('pointToSegmentDistance', () => {
  const a = { x: 0, y: 0 };
  const b = { x: 10, y: 0 };

  it('선분 위의 점은 거리 0', () => {
    expect(pointToSegmentDistance({ x: 5, y: 0 }, a, b)).toBeCloseTo(0);
  });

  it('선분 중앙에서 수직 거리', () => {
    expect(pointToSegmentDistance({ x: 5, y: 3 }, a, b)).toBeCloseTo(3);
  });

  it('끝점 너머는 끝점까지의 거리로 클램프', () => {
    expect(pointToSegmentDistance({ x: 13, y: 0 }, a, b)).toBeCloseTo(3);
  });

  it('길이 0 선분은 점까지의 거리', () => {
    expect(pointToSegmentDistance({ x: 3, y: 4 }, a, a)).toBeCloseTo(5);
  });
});

describe('strokeHit', () => {
  const stroke = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
  ];

  it('반경 안이면 닿음', () => {
    expect(strokeHit(stroke, { x: 5, y: 1 }, 1.5)).toBe(true);
  });

  it('반경 밖이면 안 닿음', () => {
    expect(strokeHit(stroke, { x: 5, y: 5 }, 1.5)).toBe(false);
  });

  it('점 1개짜리 획은 그 점과의 거리로 판정', () => {
    expect(strokeHit([{ x: 0, y: 0 }], { x: 1, y: 0 }, 2)).toBe(true);
    expect(strokeHit([{ x: 0, y: 0 }], { x: 5, y: 0 }, 2)).toBe(false);
  });

  it('빈 획은 항상 안 닿음', () => {
    expect(strokeHit([], { x: 0, y: 0 }, 100)).toBe(false);
  });
});

describe('pickStrokeAt', () => {
  const strokes: Strokelike[] = [
    { id: 'a', points: [{ x: 0, y: 0 }, { x: 10, y: 0 }], width: 2, zIndex: 0 },
    { id: 'b', points: [{ x: 0, y: 0 }, { x: 10, y: 0 }], width: 2, zIndex: 5 },
  ];

  it('닿은 획 중 zIndex 최상위를 고른다', () => {
    expect(pickStrokeAt(strokes, { x: 5, y: 0 }, 0)).toBe('b');
  });

  it('닿은 획이 없으면 null', () => {
    expect(pickStrokeAt(strokes, { x: 5, y: 50 }, 0)).toBeNull();
  });

  it('두께가 두꺼울수록 닿음 반경이 넓다', () => {
    const fat: Strokelike[] = [
      { id: 'fat', points: [{ x: 0, y: 0 }, { x: 10, y: 0 }], width: 8, zIndex: 0 },
    ];
    // width/2=4, padding 0 → y=3은 닿음
    expect(pickStrokeAt(fat, { x: 5, y: 3 }, 0)).toBe('fat');
  });
});
