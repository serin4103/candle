// viewer3d/meshes/cakeGeometry 단위 테스트 — 정점/UV가 굽기 규약에 맞는지(WebGL 불필요).
import { describe, it, expect } from 'vitest';
import { getNet } from '@candle/shared/geometry';
import type { Shape } from '@candle/shared';
import { buildSideGeometry, buildCapGeometry } from './cakeGeometry';

const SPEC = { size: 1, height: 7, layers: 1 };

function uvsInUnitRange(geom: ReturnType<typeof buildSideGeometry>): boolean {
  const uv = geom.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) {
    const u = uv.getX(i);
    const v = uv.getY(i);
    if (u < -1e-6 || u > 1 + 1e-6 || v < -1e-6 || v > 1 + 1e-6) return false;
  }
  return true;
}

describe.each(['circle', 'square', 'heart'] as Shape[])('cakeGeometry (%s)', (shape) => {
  const net = getNet(shape, SPEC);
  const count = net.crossSection.points.length;

  it('옆면: 정점·UV 수가 (둘레점+seam)×2이고 모든 UV가 [0,1]', () => {
    const side = buildSideGeometry(net);
    const expectedVerts = (count + 1) * 2;
    expect(side.getAttribute('position').count).toBe(expectedVerts);
    expect(side.getAttribute('uv').count).toBe(expectedVerts);
    expect(side.getIndex()).not.toBeNull();
    expect(uvsInUnitRange(side)).toBe(true);
  });

  it('뚜껑: 정점 수가 둘레점 수와 같고, 삼각분할 인덱스가 있으며 UV가 [0,1]', () => {
    const cap = buildCapGeometry(net, net.side.height / 2);
    expect(cap.getAttribute('position').count).toBe(count);
    const index = cap.getIndex();
    expect(index).not.toBeNull();
    expect(index!.count % 3).toBe(0);
    expect(index!.count).toBeGreaterThanOrEqual((count - 2) * 3);
    expect(uvsInUnitRange(cap)).toBe(true);
  });

  it('옆면 위/아래 링 y가 ±height/2', () => {
    const side = buildSideGeometry(net);
    const pos = side.getAttribute('position');
    const ys = new Set<number>();
    for (let i = 0; i < pos.count; i++) ys.add(Number(pos.getY(i).toFixed(4)));
    expect(ys.has(Number((net.side.height / 2).toFixed(4)))).toBe(true);
    expect(ys.has(Number((-net.side.height / 2).toFixed(4)))).toBe(true);
  });
});
