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
  applyForwardRotation,
  runFromPoints,
  centerOfPoints,
  resamplePath,
  recomputeForSpec,
  sideGridU,
  topOrientation,
  orientedTopCrossSection,
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
    '%s 전개도: 옆면 width=둘레, height=전체높이, 윗면은 옆면 위에 배치',
    (shape) => {
      const net = getNet(shape, spec);
      const cs = buildCrossSection(shape, spec);
      expect(net.side.width).toBeCloseTo(cs.perimeter, 6);
      expect(net.side.height).toBeCloseTo(totalHeight(spec), 6);
      // 윗면은 옆면 위(여백 포함).
      expect(net.top.y + net.top.height).toBeLessThanOrEqual(net.side.y);
      // 옆면은 항상 가로 가운데.
      expect(net.side.x + net.side.width / 2).toBeCloseTo(net.bounds.width / 2, 6);
      // 윗면 가로 위치: 사각형은 옆면 한 면(둘레 1/4 지점) 위, 그 외엔 가운데.
      if (shape === 'square') {
        expect(net.top.x).toBeCloseTo(net.side.x + net.side.width / 4, 6);
      } else {
        expect(net.top.x + net.top.width / 2).toBeCloseTo(net.bounds.width / 2, 6);
      }
      // 윗면은 항상 옆면 가로 범위 안.
      expect(net.top.x).toBeGreaterThanOrEqual(net.side.x - 1e-6);
      expect(net.top.x + net.top.width).toBeLessThanOrEqual(net.side.x + net.side.width + 1e-6);
      // 전체 bounds는 양수이고 모든 영역을 포함.
      expect(net.bounds.width).toBeGreaterThan(0);
      expect(net.bounds.height).toBeCloseTo(net.side.y + net.side.height, 6);
    },
  );
});

describe('sideGridU (옆면 눈금선 = 3D 면·모서리 참조)', () => {
  it('사각형: 네 모서리 → 1/4·2/4·3/4 세 눈금', () => {
    const us = sideGridU('square', spec);
    expect(us).toHaveLength(3);
    expect(us[0]).toBeCloseTo(0.25, 4);
    expect(us[1]).toBeCloseTo(0.5, 4);
    expect(us[2]).toBeCloseTo(0.75, 4);
  });

  it('하트: 아래 꼭지점(둘레 가운데)에 눈금이 잡힌다', () => {
    const us = sideGridU('heart', spec);
    expect(us.length).toBeGreaterThanOrEqual(1);
    expect(us.some((u) => Math.abs(u - 0.5) < 0.03)).toBe(true);
  });

  it('원형: 꺾임(모서리)이 없어 눈금 없음', () => {
    expect(sideGridU('circle', spec)).toEqual([]);
  });

  it('모든 눈금은 옆면 안쪽(0<u<1, 이음매 제외)이고 오름차순', () => {
    for (const shape of ['circle', 'square', 'heart'] as const) {
      const us = sideGridU(shape, spec);
      expect(us.every((u) => u > 0 && u < 1)).toBe(true);
      expect([...us].sort((a, b) => a - b)).toEqual(us);
    }
  });
});

describe('topOrientation / orientedTopCrossSection (윗면 가운데↔옆면 가운데 접합)', () => {
  it('사각형은 회전하지 않는다(한 면 위 축 정렬)', () => {
    expect(topOrientation(getNet('square', spec))).toBe(0);
  });

  it('하트는 아래 꼭지점이 이미 둘레 절반 → 회전 ≈ 0', () => {
    expect(Math.abs(topOrientation(getNet('heart', spec)))).toBeLessThan(1e-6);
  });

  it('원형은 -90°(옆면 가운데 점이 뚜껑 아래로)', () => {
    expect(topOrientation(getNet('circle', spec))).toBeCloseTo(-Math.PI / 2, 6);
  });

  it('orient 후: 옆면 가운데(둘레 절반)에 닿는 점이 뚜껑 외곽선의 아래쪽 가운데에 온다', () => {
    for (const shape of ['circle', 'square', 'heart'] as const) {
      const net = getNet(shape, spec);
      const oriented = orientedTopCrossSection(net);
      // 둘레 절반 지점의 인덱스(원형·하트는 점열 중앙, 사각형은 회전 없음으로 검증 제외).
      if (shape === 'square') continue;
      const cum = net.crossSection.cumulative;
      const half = net.crossSection.perimeter / 2;
      let mi = 0;
      for (let i = 0; i < cum.length; i++) if (Math.abs(cum[i]! - half) < Math.abs(cum[mi]! - half)) mi = i;
      const zs = oriented.map((p) => p.z);
      const xs = oriented.map((p) => p.x);
      const maxZ = Math.max(...zs);
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
      // 가운데 점은 z가 (거의) 최대(아래)이고 x가 (거의) 중앙.
      expect(maxZ - oriented[mi]!.z).toBeLessThan(0.05 * diameterForSize(spec.size));
      expect(Math.abs(oriented[mi]!.x - cx)).toBeLessThan(0.05 * diameterForSize(spec.size));
    }
  });
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

describe('applyForwardRotation', () => {
  it('회전 0이면 원점 기준 평행이동만', () => {
    const p = applyForwardRotation(
      { x: 5, y: 5, scale: 1, rotation: 0 },
      { x: 3, y: 4 },
    );
    expect(p.x).toBeCloseTo(8, 9);
    expect(p.y).toBeCloseTo(9, 9);
  });

  it('applyInverseRotation의 역 — 왕복하면 원래 로컬 좌표', () => {
    const t = { x: 12, y: -3, scale: 2, rotation: 0.7 };
    const local = { x: 4, y: -2 };
    const world = applyForwardRotation(t, local);
    const back = applyInverseRotation(t, world);
    expect(back.x).toBeCloseTo(local.x, 9);
    expect(back.y).toBeCloseTo(local.y, 9);
  });
});

describe('runFromPoints', () => {
  it('중심·길이·방향을 구한다(수평 오른쪽)', () => {
    const r = runFromPoints({ x: 0, y: 0 }, { x: 10, y: 0 });
    expect(r.center).toEqual({ x: 5, y: 0 });
    expect(r.length).toBeCloseTo(10, 9);
    expect(r.rotation).toBeCloseTo(0, 9);
  });

  it('대각선 길이·각도', () => {
    const r = runFromPoints({ x: 0, y: 0 }, { x: 3, y: 4 });
    expect(r.length).toBeCloseTo(5, 9);
    expect(r.rotation).toBeCloseTo(Math.atan2(4, 3), 9);
    expect(r.center).toEqual({ x: 1.5, y: 2 });
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

describe('centerOfPoints', () => {
  it('경계상자 중심을 구한다(없으면 원점)', () => {
    expect(centerOfPoints([])).toEqual({ x: 0, y: 0 });
    expect(centerOfPoints([{ x: 0, y: 20 }, { x: 20, y: 20 }])).toEqual({ x: 10, y: 20 });
    expect(centerOfPoints([{ x: -10, y: -4 }, { x: 10, y: 4 }])).toEqual({ x: 0, y: 0 });
  });
});

describe('resamplePath (파이핑 모티프 배치)', () => {
  it('고정 간격으로 샘플 → 경로가 길수록 개수만 증가(크기 불변)', () => {
    const short = resamplePath([{ x: 0, y: 0 }, { x: 10, y: 0 }], 1);
    const long = resamplePath([{ x: 0, y: 0 }, { x: 40, y: 0 }], 1);
    expect(short.length).toBe(11); // 0,1,…,10
    expect(long.length).toBe(41); // 0,1,…,40
    expect(long.length).toBeGreaterThan(short.length);
  });

  it('간격이 고정이라 위치가 정확히 spacing마다 찍힌다', () => {
    const s = resamplePath([{ x: 0, y: 0 }, { x: 10, y: 0 }], 2);
    expect(s.map((p) => p.x)).toEqual([0, 2, 4, 6, 8, 10]);
    expect(s.every((p) => Math.abs(p.y) < 1e-9)).toBe(true);
  });

  it('접선각을 반환한다(수평 경로=0, 수직 경로=±90°)', () => {
    const horiz = resamplePath([{ x: 0, y: 0 }, { x: 10, y: 0 }], 5);
    expect(horiz[0]!.angle).toBeCloseTo(0, 9);
    const vert = resamplePath([{ x: 0, y: 0 }, { x: 0, y: 10 }], 5);
    expect(Math.abs(vert[0]!.angle)).toBeCloseTo(Math.PI / 2, 9);
  });

  it('점 1개·간격 0은 그 점 하나만', () => {
    expect(resamplePath([{ x: 3, y: 4 }], 1)).toEqual([{ x: 3, y: 4, angle: 0 }]);
    expect(resamplePath([{ x: 0, y: 0 }, { x: 9, y: 0 }], 0)).toHaveLength(1);
  });
});
