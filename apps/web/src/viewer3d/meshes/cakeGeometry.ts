// viewer3d/meshes/cakeGeometry — 전개도(Net)로부터 케이크 메시 BufferGeometry를 만든다(View).
// 원형/사각/하트 모두 같은 경로: shared/geometry의 crossSection(둘레 호장)으로 옆면 벽을,
// 단면 폴리곤 삼각분할로 윗면 뚜껑을 만든다. UV는 "구운-전개도 규약"을 따른다:
//   u = netX / bounds.width,  v = 1 - netY / bounds.height   (CanvasTexture flipY 보정)
// 좌표·치수 규칙은 geometry가 단일 출처 — 여기선 그 결과로 정점·UV를 배치만 한다.
import { BufferGeometry, Float32BufferAttribute, ShapeUtils, Vector2 } from 'three';
import type { Net } from '@candle/shared/geometry';

/** 전개도 점(netX, netY) → 구운-전개도 UV. flipY=true CanvasTexture 기준. */
function uvFor(net: Net, netX: number, netY: number): [number, number] {
  return [netX / net.bounds.width, 1 - netY / net.bounds.height];
}

/**
 * 단면(xz)의 부호 있는 면적. 외곽선 winding 방향을 판별한다. 양수/음수에 따라
 * 옆면 u 매핑 방향을 맞춰, shape별 winding 차이(원형·사각 vs 하트)에도
 * 바깥에서 텍스처가 좌우반전되지 않게 한다.
 */
function signedAreaXZ(points: { x: number; z: number }[]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    sum += a.x * b.z - b.x * a.z;
  }
  return sum / 2;
}

/**
 * 옆면 벽 지오메트리. 단면 둘레를 따라 위/아래 링을 잇는 사각 스트립.
 * 케이크는 y=[-H/2, H/2]로 원점 중심 배치. seam(둘레 끝)에서 u=1로 닫는다.
 */
export function buildSideGeometry(net: Net): BufferGeometry {
  const { points, cumulative, perimeter } = net.crossSection;
  const count = points.length;
  const H = net.side.height;
  const y1 = H / 2; // 윗면 쪽
  const y0 = -H / 2; // 아랫면 쪽
  const vTop = uvFor(net, net.side.x, net.side.y)[1];
  const vBottom = uvFor(net, net.side.x, net.side.y + net.side.height)[1];

  // winding이 양수(원형·사각)면 u를 역방향, 음수(하트)면 정방향으로 매핑 —
  // 어느 shape든 바깥에서 텍스처가 좌우반전되지 않도록 방향을 통일한다.
  const reverseU = signedAreaXZ(points) > 0;

  const positions: number[] = [];
  const uvs: number[] = [];
  // count+1 링(마지막은 seam: 첫 점 위치 + 누적길이=perimeter).
  for (let i = 0; i <= count; i++) {
    const p = points[i % count]!;
    const cum = i < count ? cumulative[i]! : perimeter;
    const t = cum / perimeter;
    const frac = reverseU ? 1 - t : t;
    const u = uvFor(net, net.side.x + frac * net.side.width, net.side.y)[0];
    positions.push(p.x, y1, p.z); // 위
    uvs.push(u, vTop);
    positions.push(p.x, y0, p.z); // 아래
    uvs.push(u, vBottom);
  }

  const indices: number[] = [];
  for (let i = 0; i < count; i++) {
    const a = i * 2; // top i
    const b = i * 2 + 1; // bottom i
    const c = i * 2 + 2; // top i+1
    const d = i * 2 + 3; // bottom i+1
    indices.push(a, b, d, a, d, c);
  }

  const geom = new BufferGeometry();
  geom.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geom.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

/**
 * 뚜껑(윗면/아랫면) 지오메트리. 단면 폴리곤을 earcut으로 삼각분할(하트 오목 영역 대응).
 * y는 호출자가 지정(윗면=H/2, 아랫면=-H/2). UV는 윗면 영역(net.top)에 매핑.
 */
export function buildCapGeometry(net: Net, y: number): BufferGeometry {
  const pts = net.crossSection.points;
  const minX = Math.min(...pts.map((p) => p.x));
  const minZ = Math.min(...pts.map((p) => p.z));

  const contour = pts.map((p) => new Vector2(p.x, p.z));
  const faces = ShapeUtils.triangulateShape(contour, []);

  const positions: number[] = [];
  const uvs: number[] = [];
  for (const p of pts) {
    positions.push(p.x, y, p.z);
    const [u, v] = uvFor(net, net.top.x + (p.x - minX), net.top.y + (p.z - minZ));
    uvs.push(u, v);
  }
  const indices = faces.flat();

  const geom = new BufferGeometry();
  geom.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geom.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}
