// editor2d/canvas/netPath — 전개도 프리뷰의 SVG 경로 빌더(표현 전용 순수 함수).
// 도메인 좌표·UV는 shared/geometry가 단일 출처이고, 여기서는 그 결과(Net)를
// 프리뷰 박스에 맞춰 그리는 "표시용" 경로 문자열만 만든다.
import type { Net, Point3 } from '@candle/shared/geometry';

/** 프리뷰에 그릴 한 박스 영역(px). */
export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 단면 외곽선 점들을 [0,1] 정규화한다(중심·종횡비 유지). */
function normalizeOutline(points: Point3[]): { x: number; y: number }[] {
  const xs = points.map((p) => p.x);
  const zs = points.map((p) => p.z);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);
  const w = maxX - minX || 1;
  const h = maxZ - minZ || 1;
  const scale = Math.max(w, h);
  // 정사각 비율 박스에 맞추되 중앙 정렬.
  const offX = (scale - w) / 2;
  const offZ = (scale - h) / 2;
  return points.map((p) => ({
    x: (p.x - minX + offX) / scale,
    y: (p.z - minZ + offZ) / scale,
  }));
}

/** 윗면(TOP) 윤곽을 box 안에 맞춘 닫힌 SVG path. shape별로 모양이 달라진다. */
export function topOutlinePath(net: Net, box: Box): string {
  const norm = normalizeOutline(net.crossSection.points);
  const cmds = norm.map((p, i) => {
    const px = box.x + p.x * box.width;
    const py = box.y + p.y * box.height;
    return `${i === 0 ? 'M' : 'L'}${px.toFixed(2)},${py.toFixed(2)}`;
  });
  return `${cmds.join(' ')} Z`;
}

/**
 * 옆면(SIDE 전개) 상단 가장자리의 크림 스캘럽 path.
 * box 폭을 count개의 반원으로 채운다(표현용 장식).
 */
export function sideScallopPath(box: Box, count = 12): string {
  const r = box.width / (count * 2);
  let d = `M${box.x.toFixed(2)},${box.y.toFixed(2)}`;
  for (let i = 0; i < count; i++) {
    const cx = box.x + (i * 2 + 1) * r;
    const endX = box.x + (i + 1) * 2 * r;
    // 아래로 볼록한 반원(스캘럽).
    d += ` A${r.toFixed(2)},${r.toFixed(2)} 0 0 1 ${endX.toFixed(2)},${box.y.toFixed(2)}`;
    void cx;
  }
  return d;
}
