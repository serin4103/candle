// editor2d/elements/elementSvg — 요소를 SVG 마크업 "문자열"로 그리는 순수 빌더.
// 단일 출처: 2D 에디터 View(ElementView/PipingRun)와 3D 텍스처 베이커(viewer3d/texture)가
// 같은 마크업을 공유한다("같은 디자인 문서, 두 렌더링" 원칙). 좌표·치수 로직은
// shared/geometry·catalog가 단일 출처 — 여기선 그 결과를 SVG 문자열로 직렬화만 한다.
// 규칙: 순수 함수. DOM·렌더 기술 의존 없음.
import type { Element } from '@candle/shared';
import {
  illustrationAsset,
  illustrationDataUri,
  elementLocalSize,
  ILLUSTRATION_SIZE,
  PIPING_HEIGHT,
  PIPING_UNIT,
  LETTER_FONT_CM,
} from './catalog';

/** XML 텍스트 노드 이스케이프(&, <, >). */
function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** XML 속성값 이스케이프(텍스트 + 따옴표). */
function escapeAttr(s: string): string {
  return escapeXml(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** 숫자를 소수 2자리 문자열로(불필요한 정밀도 제거). */
function n(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

/**
 * 파이핑 런 마크업 — 중심(0,0) 기준 length만큼 가로로 펼친 모티프 반복.
 * ElementView의 PipingRun(JSX)과 동일한 도형을 문자열로 만든다.
 */
export function pipingMarkup(variant: string, color: string, length: number): string {
  const half = length / 2;
  const units = Math.max(1, Math.round(length / PIPING_UNIT));
  const fill = escapeAttr(color);

  if (variant === 'scallop') {
    const w = length / units;
    const r = w / 2;
    let d = `M ${n(-half)} 0`;
    for (let i = 0; i < units; i++) {
      const x = -half + (i + 1) * w;
      d += ` A ${n(r)} ${n(r)} 0 0 0 ${n(x)} 0`;
    }
    return `<path d="${d}" fill="none" stroke="${fill}" stroke-width="${n(PIPING_HEIGHT * 0.22)}" stroke-linecap="round"/>`;
  }

  if (variant === 'star-tip') {
    const outer = PIPING_HEIGHT / 2;
    const inner = outer * 0.45;
    const star: string[] = [];
    for (let i = 0; i < 10; i++) {
      const rad = (Math.PI * i) / 5 - Math.PI / 2;
      const rr = i % 2 === 0 ? outer : inner;
      star.push(`${n(Math.cos(rad) * rr)},${n(Math.sin(rad) * rr)}`);
    }
    const count = units + 1;
    const step = count > 1 ? length / (count - 1) : 0;
    const polys = Array.from(
      { length: count },
      (_, i) => `<polygon points="${star.join(' ')}" transform="translate(${n(-half + i * step)} 0)"/>`,
    ).join('');
    return `<g fill="${fill}">${polys}</g>`;
  }

  // dots
  const count = units + 1;
  const step = count > 1 ? length / (count - 1) : 0;
  const r = PIPING_HEIGHT * 0.3;
  const dots = Array.from(
    { length: count },
    (_, i) => `<circle cx="${n(-half + i * step)}" cy="0" r="${n(r)}"/>`,
  ).join('');
  return `<g fill="${fill}">${dots}</g>`;
}

/** 레터링 마크업 — 중심(0,0) 기준 텍스트. */
function letteringMarkup(text: string, font: string, color: string): string {
  return (
    `<text x="0" y="0" text-anchor="middle" dominant-baseline="central"` +
    ` font-family="${escapeAttr(font)}" font-size="${n(LETTER_FONT_CM)}"` +
    ` fill="${escapeAttr(color)}">${escapeXml(text)}</text>`
  );
}

/** 일러스트 마크업 — 색상 교체 반영 데이터 URI를 <image>로 배치. */
function illustrationMarkup(element: Extract<Element, { type: 'illustration' }>): string {
  const asset = illustrationAsset(element.assetId);
  if (!asset) return placeholderMarkup();
  const { width, height } = elementLocalSize(element);
  const href = illustrationDataUri(asset, element.colors);
  return (
    `<image href="${href}" x="${n(-width / 2)}" y="${n(-height / 2)}"` +
    ` width="${n(width)}" height="${n(height)}" preserveAspectRatio="xMidYMid meet"/>`
  );
}

/** 자리표시 박스(자산 없음·미지원 타입). */
function placeholderMarkup(): string {
  const s = ILLUSTRATION_SIZE;
  return `<rect x="${n(-s / 2)}" y="${n(-s / 2)}" width="${n(s)}" height="${n(s)}" fill="#ccc"/>`;
}

/** 요소 한 개의 본체 마크업(중심 0,0 기준, transform 미적용). */
export function elementInnerMarkup(element: Element): string {
  switch (element.type) {
    case 'lettering':
      return letteringMarkup(element.text, element.font, element.color);
    case 'piping':
      return pipingMarkup(element.variant, element.color, element.length);
    case 'illustration':
      return illustrationMarkup(element);
    default:
      // image/drawing(Must 미사용)
      return placeholderMarkup();
  }
}

/** 요소를 transform(중심점·회전·스케일)대로 배치한 <g> 마크업. */
export function elementGroupMarkup(element: Element): string {
  const { x, y, scale, rotation } = element.transform;
  const deg = (rotation * 180) / Math.PI;
  const transform = `translate(${n(x)} ${n(y)}) rotate(${n(deg)}) scale(${n(scale)})`;
  return `<g transform="${transform}">${elementInnerMarkup(element)}</g>`;
}
