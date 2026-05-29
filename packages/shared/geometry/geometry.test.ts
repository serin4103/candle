import { describe, it, expect } from 'vitest';
import type { Spec } from '../schema/index';
import {
  diameterForSize,
  totalHeight,
  buildCrossSection,
  getNet,
  uvForNetPoint,
  boundaryPointForU,
  screenToNet,
  netToScreen,
  applyInverseRotation,
  recomputeForSpec,
  SIZE_BASE_DIAMETER_CM,
  SIZE_STEP_CM,
} from './index';

const spec: Spec = { size: 2, height: 7, layers: 1 };

describe('diameterForSize', () => {
  it('1호 = 기준 지름, 호당 +STEP', () => {
    expect(diameterForSize(1)).toBe(SIZE_BASE_DIAMETER_CM);
    expect(diameterForSize(2)).toBe(SIZE_BASE_DIAMETER_CM + SIZE_STEP_CM);
    expect(diameterForSize(3)).toBe(SIZE_BASE_DIAMETER_CM + 2 * SIZE_STEP_CM);
  });
});

describe('totalHeight', () => {
  it('한 단 높이 × 단 수', () => {
    expect(totalHeight({ size: 1, height: 7, layers: 1 })).toBe(7);
    expect(totalHeight({ size: 1, height: 6, layers: 3 })).toBe(18);
  });
});

describe('buildCrossSection', () => {
  it('원형 둘레 ≈ π·지름', () => {
    const cs = buildCrossSection('circle', spec);
    const expected = Math.PI * diameterForSize(spec.size);
    // 다각형 근사라 약간 작다. 1% 이내.
    expect(cs.perimeter).toBeGreaterThan(expected * 0.99);
    expect(cs.perimeter).toBeLessThanOrEqual(expected);
  });

  it('사각형 둘레 = 4 × 한 변', () => {
    const cs = buildCrossSection('square', spec);
    expect(cs.perimeter).toBeCloseTo(4 * diameterForSize(spec.size), 6);
  });

  it('하트 단면도 닫힌 루프이고 둘레·누적이 일관된다 (PoC)', () => {
    const cs = buildCrossSection('heart', spec);
    expect(cs.points.length).toBeGreaterThan(0);
    expect(cs.cumulative.length).toBe(cs.points.length);
    expect(cs.cumulative[0]).toBe(0);
    // 누적은 단조 증가, 둘레는 마지막 누적보다 크다(닫는 구간 존재).
    for (let i = 1; i < cs.cumulative.length; i++) {
      expect(cs.cumulative[i]!).toBeGreaterThan(cs.cumulative[i - 1]!);
    }
    expect(cs.perimeter).toBeGreaterThan(cs.cumulative[cs.cumulative.length - 1]!);
    expect(cs.perimeter).toBeGreaterThan(0);
  });

  it('하트 단면의 가로 폭 ≈ 지름 (정규화 검증)', () => {
    const cs = buildCrossSection('heart', spec);
    const xs = cs.points.map((p) => p.x);
    const width = Math.max(...xs) - Math.min(...xs);
    expect(width).toBeCloseTo(diameterForSize(spec.size), 6);
  });

  it('하트는 위가 넓고 아래가 뾰족 (꼭지점 하단·z>0, 최대폭은 상단·z<0)', () => {
    const cs = buildCrossSection('heart', spec);
    // 최대 x(오른쪽 로브)는 상단(z<0)에 위치.
    const widest = cs.points.reduce((m, p) => (p.x > m.x ? p : m), cs.points[0]!);
    expect(widest.z).toBeLessThan(0);
    // 최대 z(아래 꼭지점)는 가로 중앙(x≈0).
    const lowest = cs.points.reduce((m, p) => (p.z > m.z ? p : m), cs.points[0]!);
    expect(Math.abs(lowest.x)).toBeLessThan(0.05 * diameterForSize(spec.size));
  });
});

describe('getNet', () => {
  it.each(['circle', 'square', 'heart'] as const)(
    '%s 전개도: 옆면 width=둘레, height=전체높이, 윗면은 옆면 아래',
    (shape) => {
      const net = getNet(shape, spec);
      const cs = buildCrossSection(shape, spec);
      expect(net.side.width).toBeCloseTo(cs.perimeter, 6);
      expect(net.side.height).toBeCloseTo(totalHeight(spec), 6);
      // 윗면은 옆면 아래(여백 포함).
      expect(net.top.y).toBeGreaterThan(net.side.y + net.side.height);
      // 전체 bounds는 양수이고 모든 영역을 포함.
      expect(net.bounds.width).toBeGreaterThan(0);
      expect(net.bounds.height).toBeGreaterThanOrEqual(net.top.y + net.top.height);
    },
  );
});

describe('uvForNetPoint', () => {
  it('전개도 원점→(0,0), bounds 끝→(1,1)', () => {
    const net = getNet('circle', spec);
    expect(uvForNetPoint('circle', spec, { x: 0, y: 0 })).toEqual({ u: 0, v: 0 });
    const uv = uvForNetPoint('circle', spec, {
      x: net.bounds.width,
      y: net.bounds.height,
    });
    expect(uv.u).toBeCloseTo(1, 6);
    expect(uv.v).toBeCloseTo(1, 6);
  });

  it('bounds 밖 좌표는 [0,1]로 클램프', () => {
    const net = getNet('circle', spec);
    const uv = uvForNetPoint('circle', spec, {
      x: net.bounds.width * 2,
      y: -10,
    });
    expect(uv.u).toBe(1);
    expect(uv.v).toBe(0);
  });
});

describe('boundaryPointForU (하트 옆면↔3D 매핑 PoC)', () => {
  it.each(['circle', 'square', 'heart'] as const)(
    '%s: u=0은 단면 시작점과 일치',
    (shape) => {
      const cs = buildCrossSection(shape, spec);
      const p = boundaryPointForU(shape, spec, 0);
      expect(p.x).toBeCloseTo(cs.points[0]!.x, 6);
      expect(p.z).toBeCloseTo(cs.points[0]!.z, 6);
    },
  );

  it('u가 커지면 호장을 따라 이동(서로 다른 점)', () => {
    const a = boundaryPointForU('heart', spec, 0);
    const b = boundaryPointForU('heart', spec, 0.5);
    expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(0);
  });

  it('u는 [0,1]로 클램프되어 항상 단면 위 점을 반환', () => {
    const p = boundaryPointForU('heart', spec, 1.5);
    expect(Number.isFinite(p.x)).toBe(true);
    expect(Number.isFinite(p.z)).toBe(true);
  });
});

describe('screenToNet / netToScreen', () => {
  const viewport = { panX: 120, panY: -40, zoom: 2.5 };

  it('왕복하면 원래 점으로 복원된다', () => {
    const point = { x: 33.3, y: -12.7 };
    const round = netToScreen(viewport, screenToNet(viewport, point));
    expect(round.x).toBeCloseTo(point.x, 9);
    expect(round.y).toBeCloseTo(point.y, 9);
  });

  it('netToScreen은 줌·팬을 적용한다', () => {
    expect(netToScreen(viewport, { x: 0, y: 0 })).toEqual({ x: 120, y: -40 });
    expect(netToScreen(viewport, { x: 10, y: 0 })).toEqual({ x: 145, y: -40 });
  });
});

describe('applyInverseRotation', () => {
  it('회전 0이면 원점 기준 평행이동만', () => {
    const local = applyInverseRotation(
      { x: 5, y: 5, scale: 1, rotation: 0 },
      { x: 8, y: 9 },
    );
    expect(local.x).toBeCloseTo(3, 9);
    expect(local.y).toBeCloseTo(4, 9);
  });

  it('π/2 회전 요소: 전역 (1,0)+원점 → 로컬 (0,-1)', () => {
    const local = applyInverseRotation(
      { x: 0, y: 0, scale: 1, rotation: Math.PI / 2 },
      { x: 1, y: 0 },
    );
    expect(local.x).toBeCloseTo(0, 9);
    expect(local.y).toBeCloseTo(-1, 9);
  });
});

describe('recomputeForSpec', () => {
  it('파생 치수와 전개도를 함께 반환', () => {
    const r = recomputeForSpec('circle', spec);
    expect(r.diameter).toBe(diameterForSize(spec.size));
    expect(r.totalHeight).toBe(totalHeight(spec));
    expect(r.circumference).toBeCloseTo(r.net.crossSection.perimeter, 9);
    expect(r.net.shape).toBe('circle');
  });
});
