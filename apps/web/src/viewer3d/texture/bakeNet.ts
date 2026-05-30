// viewer3d/texture/bakeNet — 전개도→텍스처 굽기(ViewModel, 동기화 핵심).
// document/store의 디자인을 전개도 SVG로 직렬화하고, 오프스크린 캔버스에 래스터화한다.
// 레이어 규칙: 여기서는 three를 import하지 않는다(ESLint 강제). three.CanvasTexture 래핑은
// View(viewer3d/CakeViewer3D)가 한다 — 여기는 캔버스(이미지)까지만 책임진다.
// 좌표·도형 마크업은 shared/geometry·editor2d의 순수 빌더가 단일 출처(중복 구현 금지).
import type { Design } from '@candle/shared';
import { getNet, orientedTopCrossSection } from '@candle/shared/geometry';
import type { Net } from '@candle/shared/geometry';
import { topOutlinePath } from '../../editor2d/canvas/netPath';
import { elementGroupMarkup } from '../../editor2d/elements/elementSvg';

/** 텍스처 해상도(전개도 cm당 픽셀). */
export const NET_PX_PER_CM = 12;
/** 텍스처 한 변 최대 픽셀(과도한 캔버스 방지). */
export const NET_MAX_PX = 2048;

/** 속성값용 XML 이스케이프(색상 등). */
function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * 전개도 내부 마크업(순수) — 윗면(단면 외곽선)·옆면(둘레×높이) 크림 채움 + 요소를
 * zIndex 순으로 얹는다. `<svg>` 래퍼는 호출부가 viewBox와 함께 감싼다. 전개도 굽기와
 * 윗면 썸네일이 이 단일 출처를 공유한다(중복 구현 금지 — CLAUDE.md).
 */
export function netInnerMarkup(design: Design, net: Net): string {
  const cream = escapeAttr(design.creamColor);
  const topPath = topOutlinePath(orientedTopCrossSection(net), net.top.x, net.top.y);
  const elements = [...design.elements]
    .sort((a, b) => a.zIndex - b.zIndex)
    .map(elementGroupMarkup)
    .join('');

  return (
    `<path d="${topPath}" fill="${cream}"/>` +
    `<rect x="${net.side.x.toFixed(2)}" y="${net.side.y.toFixed(2)}"` +
    ` width="${net.side.width.toFixed(2)}" height="${net.side.height.toFixed(2)}" fill="${cream}"/>` +
    elements
  );
}

/**
 * 디자인을 전개도 SVG 문자열로 만든다(순수). viewBox는 전개도 bounds 그대로 —
 * 즉 SVG 픽셀(0..bounds)이 곧 UV 정규화 기준이 된다(구운-전개도 규약과 일치).
 */
export function buildNetSvg(design: Design): string {
  const net = getNet(design.shape, design.spec);
  const { width: w, height: h } = net.bounds;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w.toFixed(2)} ${h.toFixed(2)}">` +
    netInnerMarkup(design, net) +
    `</svg>`
  );
}

/** 전개도 bounds로부터 텍스처 픽셀 크기(해상도·상한 반영). */
export function netTextureSize(net: Net): { width: number; height: number } {
  const raw = Math.max(net.bounds.width, net.bounds.height) * NET_PX_PER_CM;
  const scale = raw > NET_MAX_PX ? NET_MAX_PX / raw : 1;
  return {
    width: Math.max(1, Math.round(net.bounds.width * NET_PX_PER_CM * scale)),
    height: Math.max(1, Math.round(net.bounds.height * NET_PX_PER_CM * scale)),
  };
}

/**
 * SVG 문자열을 오프스크린 캔버스에 래스터화한다(DOM·비동기). three 미사용 —
 * 반환한 캔버스를 View가 CanvasTexture로 감싼다. data URL이므로 캔버스 오염 없음.
 */
export function rasterizeNetSvg(
  svg: string,
  width: number,
  height: number,
): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('2D 컨텍스트를 얻지 못했습니다.'));
      return;
    }
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas);
    };
    img.onerror = () => reject(new Error('전개도 SVG 래스터화에 실패했습니다.'));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}
