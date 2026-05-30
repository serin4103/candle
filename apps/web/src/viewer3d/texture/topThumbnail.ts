// viewer3d/texture/topThumbnail — 마이페이지 썸네일용 케이크 윗면 이미지 생성(PRD-S6 보강).
// 전개도 윗면(net.top) 영역만 잘라 작은 PNG로 굽는다. 전개도 굽기(bakeNet)와 같은
// 마크업(netInnerMarkup)을 윗면 viewBox로만 다시 써서 2D 디자인을 그대로 반영한다.
// 좌표·스케일은 전부 shared/geometry의 net.top에서만(인라인 좌표 수학 금지).
import type { Design } from '@candle/shared';
import { getNet } from '@candle/shared/geometry';
import { netInnerMarkup, rasterizeNetSvg } from './bakeNet';

/** 썸네일 한 변 최대 픽셀(작은 미리보기 — 마이페이지 카드). */
export const THUMBNAIL_MAX_PX = 256;

/**
 * 윗면만 담은 SVG 문자열(순수). viewBox를 `net.top` rect로 잡아 옆면·여백을 제외하고
 * 윗면(뚜껑)과 그 위 요소만 보이게 한다. 윗면 모양 밖(바운딩박스 모서리)은 투명.
 */
export function buildTopThumbnailSvg(design: Design): string {
  const net = getNet(design.shape, design.spec);
  const { x, y, width, height } = net.top;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg"` +
    ` viewBox="${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)}">` +
    netInnerMarkup(design, net) +
    `</svg>`
  );
}

/** 캔버스를 PNG Blob으로 인코딩(비동기 콜백 → Promise). */
function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('썸네일 PNG 인코딩에 실패했습니다.'))),
      'image/png',
    );
  });
}

/**
 * 디자인의 케이크 윗면을 작은 PNG Blob으로 굽는다(DOM·비동기). 윗면 종횡비를 유지한
 * 채 한 변이 maxPx를 넘지 않도록 스케일한다. 저장 흐름(share)이 업로드 전에 호출한다.
 */
export async function buildTopThumbnail(
  design: Design,
  maxPx = THUMBNAIL_MAX_PX,
): Promise<Blob> {
  const net = getNet(design.shape, design.spec);
  const { width, height } = net.top;
  const scale = maxPx / Math.max(width, height);
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const canvas = await rasterizeNetSvg(buildTopThumbnailSvg(design), w, h);
  return canvasToPngBlob(canvas);
}
