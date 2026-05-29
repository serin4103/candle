import { describe, it, expect } from 'vitest';
import { getNet } from '@candle/shared/geometry';
import type { Spec } from '@candle/shared';
import { topOutlinePath, sideScallopPath } from './netPath';

const spec: Spec = { size: 1, height: 7, layers: 1 };
const box = { x: 0, y: 0, width: 100, height: 100 };

describe('topOutlinePath', () => {
  it('닫힌 path(Z)를 반환한다', () => {
    const path = topOutlinePath(getNet('circle', spec), box);
    expect(path.startsWith('M')).toBe(true);
    expect(path.trim().endsWith('Z')).toBe(true);
  });

  it('shape마다 경로가 다르다 (모양이 전개도에 반영됨)', () => {
    const circle = topOutlinePath(getNet('circle', spec), box);
    const square = topOutlinePath(getNet('square', spec), box);
    const heart = topOutlinePath(getNet('heart', spec), box);
    expect(circle).not.toBe(square);
    expect(square).not.toBe(heart);
    expect(circle).not.toBe(heart);
  });

  it('모든 좌표가 box 범위 안에 있다', () => {
    const path = topOutlinePath(getNet('heart', spec), box);
    const coords = path.match(/-?\d+\.\d+/g)!.map(Number);
    for (const c of coords) {
      expect(c).toBeGreaterThanOrEqual(-0.01);
      expect(c).toBeLessThanOrEqual(100.01);
    }
  });
});

describe('sideScallopPath', () => {
  it('M으로 시작하고 count개의 호(A)를 포함한다', () => {
    const path = sideScallopPath(box, 8);
    expect(path.startsWith('M')).toBe(true);
    expect((path.match(/A/g) ?? []).length).toBe(8);
  });
});
