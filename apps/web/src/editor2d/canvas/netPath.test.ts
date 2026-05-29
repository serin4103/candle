import { describe, it, expect } from 'vitest';
import { getNet } from '@candle/shared/geometry';
import type { Spec } from '@candle/shared';
import { topOutlinePath } from './netPath';

const spec: Spec = { size: 1, height: 7, layers: 1 };

describe('topOutlinePath', () => {
  it('닫힌 path(Z)를 반환하고 (ox,oy)부터 시작', () => {
    const path = topOutlinePath(getNet('circle', spec).crossSection.points, 10, 20);
    expect(path.startsWith('M')).toBe(true);
    expect(path.trim().endsWith('Z')).toBe(true);
  });

  it('shape마다 경로가 다르다 (모양이 전개도에 반영됨)', () => {
    const circle = topOutlinePath(getNet('circle', spec).crossSection.points, 0, 0);
    const square = topOutlinePath(getNet('square', spec).crossSection.points, 0, 0);
    const heart = topOutlinePath(getNet('heart', spec).crossSection.points, 0, 0);
    expect(circle).not.toBe(square);
    expect(square).not.toBe(heart);
    expect(circle).not.toBe(heart);
  });

  it('좌표가 [ox, ox+width] 범위 안에 정렬된다', () => {
    const net = getNet('heart', spec);
    const ox = 5;
    const path = topOutlinePath(net.crossSection.points, ox, ox);
    const coords = path.match(/-?\d+\.\d+/g)!.map(Number);
    for (const c of coords) {
      expect(c).toBeGreaterThanOrEqual(ox - 0.01);
      expect(c).toBeLessThanOrEqual(ox + net.top.width + 0.01);
    }
  });
});

describe('옆면 길이 = 윗면 둘레 (모양별)', () => {
  it('사각형 옆면이 원형보다 길고, 둘레와 일치한다', () => {
    const circle = getNet('circle', spec);
    const square = getNet('square', spec);
    // net.side.width === crossSection.perimeter (둘레)
    expect(circle.side.width).toBeCloseTo(circle.crossSection.perimeter, 6);
    expect(square.side.width).toBeCloseTo(square.crossSection.perimeter, 6);
    // 같은 호수에서 사각(4d=60) > 원(πd≈47).
    expect(square.side.width).toBeGreaterThan(circle.side.width);
  });
});
