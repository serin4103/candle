// editor2d/canvas/netPath — 전개도 프리뷰의 SVG 경로 빌더(표현 전용 순수 함수).
// 도메인 좌표·치수는 shared/geometry(Net)가 단일 출처. 여기서는 그 결과를
// cm 단위 그대로 SVG path 문자열로 만든다(윗면과 옆면이 같은 스케일을 공유).
import type { Point3 } from '@candle/shared/geometry';

/**
 * 단면 외곽선을 (ox,oy)로 평행이동한 닫힌 SVG path. 좌표 단위는 net과 동일(cm).
 * 외곽선의 바운딩 박스 좌상단이 (ox,oy)에 오도록 정렬한다(스케일 변형 없음).
 */
export function topOutlinePath(points: Point3[], ox: number, oy: number): string {
  const minX = Math.min(...points.map((p) => p.x));
  const minZ = Math.min(...points.map((p) => p.z));
  const cmds = points.map((p, i) => {
    const x = (p.x - minX + ox).toFixed(2);
    const y = (p.z - minZ + oy).toFixed(2);
    return `${i === 0 ? 'M' : 'L'}${x},${y}`;
  });
  return `${cmds.join(' ')} Z`;
}

/**
 * (x,y)에서 시작해 width를 count개의 아래로 볼록한 반원으로 채우는 스캘럽 path.
 * 옆면(SIDE) 상단의 크림 테두리 장식.
 */
export function sideScallopPath(
  x: number,
  y: number,
  width: number,
  count: number,
): string {
  const r = width / (count * 2);
  let d = `M${x.toFixed(2)},${y.toFixed(2)}`;
  for (let i = 0; i < count; i++) {
    const endX = x + (i + 1) * 2 * r;
    d += ` A${r.toFixed(2)},${r.toFixed(2)} 0 0 1 ${endX.toFixed(2)},${y.toFixed(2)}`;
  }
  return d;
}
