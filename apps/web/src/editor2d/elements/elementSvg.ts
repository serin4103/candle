// editor2d/elements/elementSvg — 요소를 SVG 마크업 "문자열"로 그리는 순수 빌더.
// 단일 출처: 2D 에디터 View(ElementView/PipingRun)와 3D 텍스처 베이커(viewer3d/texture)가
// 같은 마크업을 공유한다("같은 디자인 문서, 두 렌더링" 원칙). 좌표·치수 로직은
// shared/geometry·catalog가 단일 출처 — 여기선 그 결과를 SVG 문자열로 직렬화만 한다.
// 규칙: 순수 함수. DOM·렌더 기술 의존 없음.
import type { Element } from '@candle/shared';
import { resamplePath, type Point } from '@candle/shared/geometry';
import {
  illustrationAsset,
  illustrationDataUri,
  elementLocalSize,
  ILLUSTRATION_SIZE,
  DEFAULT_PIPING_WIDTH,
  LETTER_FONT_CM,
} from './catalog';
import { getImageAsset } from './imageAssets';

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
 * 물방울 모티프 path — 박스(가로·세로 = s) 중심 기준, 끝이 위(-y)로 뾰족한 드롭.
 * 아래쪽 반원(반지름 r)에 뾰족한 꼭지를 얹은 형태.
 */
function teardropPath(s: number): string {
  const half = s / 2;
  const r = s * 0.42;
  const cy = half - r; // 불룩한 아래쪽 원의 중심 y(바닥이 +half에 닿도록)
  const tipY = -half; // 꼭지(위)
  const cx = r * 0.85; // 꼭지 부근 제어점 가로 도달
  return (
    `M 0 ${n(tipY)}` +
    ` C ${n(-cx)} ${n(tipY + s * 0.34)} ${n(-r)} ${n(cy - r * 0.55)} ${n(-r)} ${n(cy)}` +
    ` A ${n(r)} ${n(r)} 0 0 0 ${n(r)} ${n(cy)}` +
    ` C ${n(r)} ${n(cy - r * 0.55)} ${n(cx)} ${n(tipY + s * 0.34)} 0 ${n(tipY)} Z`
  );
}

/**
 * 파이핑 마크업 — 곡선 경로(points)를 따라 모티프를 일정 간격으로 찍는다.
 * 모티프 크기·간격 = width로 **고정**이라 경로가 길어지면 개수만 늘고 크기는 변하지 않는다.
 * 원형·물방울은 간격 = 지름이라 빈틈 없이(서로 접하게) 놓인다. ElementView의 PipingRun과
 * 동일한 도형을 문자열로 만든다. points는 로컬 좌표(transform 적용 전).
 */
export function pipingMarkup(
  variant: string,
  color: string,
  points: Point[],
  width: number = DEFAULT_PIPING_WIDTH,
): string {
  if (!points || points.length === 0) return '';
  const fill = escapeAttr(color);

  if (variant === 'scallop') {
    // 물결(사인파) 선 — 경로를 따라가되 접선의 수직 방향으로 사인 진동을 준다.
    // 파장·진폭은 굵기(width)에 비례해 굵기 슬라이더가 물결 크기를 정한다.
    if (points.length === 1) {
      const p = points[0]!;
      return `<circle cx="${n(p.x)}" cy="${n(p.y)}" r="${n(width / 2)}" fill="${fill}"/>`;
    }
    const lambda = Math.max(0.1, width) * 3; // 한 물결의 길이(cm) — 길수록 완만
    const amp = Math.max(0.05, width) * 0.35; // 진폭(중심선 기준) — 작을수록 완만
    const step = lambda / 16; // 매끄러운 곡선을 위한 샘플 간격
    const fine = resamplePath(points, step);
    const wave = fine.map((s, i) => {
      const d = i * step;
      const off = amp * Math.sin((2 * Math.PI * d) / lambda);
      // 접선의 좌측 법선(−sin, cos)으로 오프셋.
      return { x: s.x - Math.sin(s.angle) * off, y: s.y + Math.cos(s.angle) * off };
    });
    const path = wave.map((p, i) => `${i === 0 ? 'M' : 'L'} ${n(p.x)} ${n(p.y)}`).join(' ');
    const strokeW = Math.max(0.06, width * 0.22);
    return `<path d="${path}" fill="none" stroke="${fill}" stroke-width="${n(strokeW)}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  const samples = resamplePath(points, width);

  if (variant === 'teardrop') {
    // 물방울: 크기 = width 고정, 접선 방향으로 꼭지를 정렬해 경로를 따라 흐른다.
    const drops = samples
      .map(
        (s) =>
          `<path d="${teardropPath(width)}" transform="translate(${n(s.x)} ${n(s.y)}) rotate(${n((s.angle * 180) / Math.PI + 90)})"/>`,
      )
      .join('');
    return `<g fill="${fill}">${drops}</g>`;
  }

  // dots(원형) — 지름 = width 고정, 간격 = width라 서로 접한다(빈틈 없음).
  const dots = samples
    .map((s) => `<circle cx="${n(s.x)}" cy="${n(s.y)}" r="${n(width / 2)}"/>`)
    .join('');
  return `<g fill="${fill}">${dots}</g>`;
}

/**
 * 손그림 마크업 (PRD-S1) — 로컬 좌표(중심 기준) 점열을 잇는 polyline.
 * 파이핑처럼 group transform(translate=중심)이 전개도 위치를 맡는다.
 * 점이 1개뿐이면 점(원)으로, 0개면 빈 마크업.
 */
function drawingMarkup(element: Extract<Element, { type: 'drawing' }>): string {
  const { points, color, width } = element;
  const stroke = escapeAttr(color);
  if (points.length === 0) return '';
  if (points.length === 1) {
    const p = points[0]!;
    return `<circle cx="${n(p.x)}" cy="${n(p.y)}" r="${n(width / 2)}" fill="${stroke}"/>`;
  }
  const pts = points.map((p) => `${n(p.x)},${n(p.y)}`).join(' ');
  return (
    `<polyline points="${pts}" fill="none" stroke="${stroke}"` +
    ` stroke-width="${n(width)}" stroke-linecap="round" stroke-linejoin="round"/>`
  );
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

/**
 * 업로드 이미지 마크업(PRD-S4) — 레지스트리의 data URI를 <image>로 배치.
 * 일러스트와 동일 구조라 2D View·3D 베이커가 같은 마크업을 공유한다.
 * 자산이 아직 해석되지 않았으면 자리표시(재적재 훅이 채우면 재렌더된다).
 */
function imageMarkup(element: Extract<Element, { type: 'image' }>): string {
  const asset = getImageAsset(element.assetId);
  if (!asset) return placeholderMarkup();
  const { width, height } = elementLocalSize(element);
  return (
    `<image href="${asset.dataUri}" x="${n(-width / 2)}" y="${n(-height / 2)}"` +
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
      return pipingMarkup(element.variant, element.color, element.points, element.width);
    case 'illustration':
      return illustrationMarkup(element);
    case 'image':
      return imageMarkup(element);
    case 'drawing':
      return drawingMarkup(element);
    default:
      // 모든 요소 타입이 처리됨 — 방어적 자리표시.
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
