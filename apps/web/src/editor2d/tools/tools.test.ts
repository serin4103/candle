import { describe, it, expect } from 'vitest';
import type { Transform } from '@candle/shared';
import {
  hitTestElement,
  pickTopElement,
  handlePositions,
  cornerPoint,
  type Size,
  type Pickable,
} from './handles';
import { beginMove, beginScale, beginRotate, applyGesture } from './gestures';

const size: Size = { width: 10, height: 6 };
const at = (x: number, y: number, scale = 1, rotation = 0): Transform => ({
  x,
  y,
  scale,
  rotation,
});

describe('hitTestElement', () => {
  it('박스 안/밖 판정', () => {
    const t = at(0, 0);
    expect(hitTestElement(t, size, { x: 0, y: 0 })).toBe(true);
    expect(hitTestElement(t, size, { x: 4.9, y: 2.9 })).toBe(true);
    expect(hitTestElement(t, size, { x: 5.1, y: 0 })).toBe(false);
    expect(hitTestElement(t, size, { x: 0, y: 3.1 })).toBe(false);
  });

  it('스케일을 반영한다', () => {
    const t = at(0, 0, 2);
    expect(hitTestElement(t, size, { x: 9, y: 0 })).toBe(true); // 반폭 = 10*2/2
    expect(hitTestElement(t, size, { x: 11, y: 0 })).toBe(false);
  });

  it('회전을 반영한다(π/2)', () => {
    const t = at(0, 0, 1, Math.PI / 2);
    // 회전 후 박스는 세로로 길어짐(반높이 5). (0,4.9) 안, (4.9,0) 밖.
    expect(hitTestElement(t, size, { x: 0, y: 4.9 })).toBe(true);
    expect(hitTestElement(t, size, { x: 4.9, y: 0 })).toBe(false);
  });
});

describe('pickTopElement', () => {
  it('겹친 요소 중 zIndex가 높은 것을 고른다', () => {
    const items: Pickable[] = [
      { id: 'a', transform: at(0, 0), size, zIndex: 0 },
      { id: 'b', transform: at(0, 0), size, zIndex: 5 },
      { id: 'c', transform: at(100, 100), size, zIndex: 9 },
    ];
    expect(pickTopElement(items, { x: 0, y: 0 })).toBe('b');
  });

  it('맞은 요소가 없으면 null', () => {
    const items: Pickable[] = [{ id: 'a', transform: at(0, 0), size, zIndex: 0 }];
    expect(pickTopElement(items, { x: 50, y: 50 })).toBeNull();
  });
});

describe('handlePositions', () => {
  it('코너는 중심 대칭, 회전 핸들은 박스 위', () => {
    const t = at(0, 0);
    const { corners, rotate } = handlePositions(t, size);
    expect(corners.nw).toEqual({ x: -5, y: -3 });
    expect(corners.se).toEqual({ x: 5, y: 3 });
    expect(rotate.x).toBeCloseTo(0, 9);
    expect(rotate.y).toBeLessThan(-3); // 위쪽으로 띄움
  });
});

describe('applyGesture: move', () => {
  it('잡은 오프셋을 유지하며 중심을 옮긴다', () => {
    const t = at(10, 10);
    const g = beginMove(t, { x: 12, y: 11 }); // 오프셋 (2,1)
    const patch = applyGesture(g, { x: 20, y: 20 });
    expect(patch.x).toBe(18);
    expect(patch.y).toBe(19);
  });
});

describe('applyGesture: rotate', () => {
  it('포인터 방향에 맞춰 회전(오른쪽 → π/2)', () => {
    const t = at(0, 0);
    const g = beginRotate(t);
    const patch = applyGesture(g, { x: 5, y: 0 });
    expect(patch.rotation).toBeCloseTo(Math.PI / 2, 9);
  });
});

describe('applyGesture: scale', () => {
  it('잡은 코너를 시작 위치로 두면 스케일 변화 없음', () => {
    const t = at(0, 0, 1);
    const grabbed = cornerPoint(t, size, 'se');
    const g = beginScale(t, size, 'se');
    const patch = applyGesture(g, grabbed);
    expect(patch.scale).toBeCloseTo(1, 9);
  });

  it('코너를 pivot에서 2배 멀리 끌면 스케일 2배, pivot 고정', () => {
    const t = at(0, 0, 1);
    const pivot = cornerPoint(t, size, 'nw'); // se의 반대
    const grabbed = cornerPoint(t, size, 'se');
    const g = beginScale(t, size, 'se');
    const target = {
      x: pivot.x + (grabbed.x - pivot.x) * 2,
      y: pivot.y + (grabbed.y - pivot.y) * 2,
    };
    const patch = applyGesture(g, target);
    expect(patch.scale).toBeCloseTo(2, 9);
    // pivot(nw 코너)은 새 transform에서도 그대로여야 한다.
    const after: Transform = {
      x: patch.x!,
      y: patch.y!,
      scale: patch.scale!,
      rotation: 0,
    };
    const newNw = cornerPoint(after, size, 'nw');
    expect(newNw.x).toBeCloseTo(pivot.x, 9);
    expect(newNw.y).toBeCloseTo(pivot.y, 9);
  });
});
