// editor2d/elements/catalog — 요소 카탈로그와 로컬 크기 계산(Model, 순수).
// 라이브러리 패널이 제공하는 자산 목록과, 요소의 전개도 로컬 크기(스케일 1, cm)를
// 정의한다. 렌더 기술·상태 의존 없음 — tools(히트테스트/핸들)와 View가 함께 쓴다.
import type { Element } from '@candle/shared';
import catFaceRaw from './assets/cat-face.svg?raw';
import dogFaceRaw from './assets/dog-face.svg?raw';

/** 일러스트 자산 — assetId로 참조하는 SVG 원본(색상 교체를 위해 텍스트로 들고 있다). */
export interface IllustrationAsset {
  id: string;
  label: string;
  /** SVG 원본 텍스트. 색상 교체·데이터 URI 생성에 쓴다. */
  raw: string;
  /** 가로÷세로 비율(원본 viewBox 기준). 배치 크기 산정에 쓴다. */
  aspect: number;
  /** 원본에 등장하는 고유 색상 목록(등장 순). 각 색을 개별로 바꿀 수 있다. */
  palette: string[];
}

/** SVG 텍스트에서 viewBox로 가로÷세로 비율을 구한다(없으면 1). */
function aspectFromSvg(raw: string): number {
  const vb = raw.match(/viewBox\s*=\s*["']\s*[\d.]+\s+[\d.]+\s+([\d.]+)\s+([\d.]+)/i);
  if (vb) {
    const w = parseFloat(vb[1]!);
    const h = parseFloat(vb[2]!);
    if (w > 0 && h > 0) return w / h;
  }
  return 1;
}

/** SVG 텍스트의 고유 hex 색상을 등장 순서대로 추출한다('none'·필터 등 비색상은 제외). */
function extractColors(raw: string): string[] {
  const matches = raw.match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g) ?? [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of matches) {
    const key = c.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(c);
    }
  }
  return out;
}

/** 정규식 특수문자 이스케이프. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 자산 SVG의 팔레트 색을 colors로 치환한 SVG 텍스트를 만든다.
 * colors[i]가 있으면 palette[i]를 그 색으로 바꾼다(없으면 원본 유지).
 */
export function recoloredSvg(asset: IllustrationAsset, colors?: string[]): string {
  if (!colors?.length) return asset.raw;
  let svg = asset.raw;
  asset.palette.forEach((orig, i) => {
    const next = colors[i];
    if (next && next.toLowerCase() !== orig.toLowerCase()) {
      // 뒤에 hex 숫자가 더 붙지 않는 경우만(#fff가 #ffffff를 부분 매치하지 않도록).
      svg = svg.replace(new RegExp(escapeRegExp(orig) + '(?![0-9a-fA-F])', 'gi'), next);
    }
  });
  return svg;
}

/** SVG 텍스트를 <image>/<img>에 쓸 데이터 URI로 변환한다. */
export function svgDataUri(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** 색상 교체를 반영한 일러스트 데이터 URI(렌더용). */
export function illustrationDataUri(asset: IllustrationAsset, colors?: string[]): string {
  return svgDataUri(recoloredSvg(asset, colors));
}

/** 파이핑(크림 장식) 변형. */
export interface PipingVariant {
  id: string;
  label: string;
}

/** 레터링 폰트 선택지. */
export interface LetteringFont {
  value: string;
  label: string;
}

/** 원본 정의(파일별 raw). aspect·palette는 SVG에서 자동 추출한다. */
const ILLUSTRATION_SOURCES: { id: string; label: string; raw: string }[] = [
  { id: 'cat-face', label: '고양이', raw: catFaceRaw },
  { id: 'dog-face', label: '강아지', raw: dogFaceRaw },
];

/** 일러스트 라이브러리(PRD-M3 카테고리 1). SVG 자산을 추가하려면
 *  `assets/`에 파일을 넣고 `?raw`로 import 후 위 배열에 한 줄 추가한다. */
export const illustrations: IllustrationAsset[] = ILLUSTRATION_SOURCES.map(
  ({ id, label, raw }) => ({
    id,
    label,
    raw,
    aspect: aspectFromSvg(raw),
    palette: extractColors(raw),
  }),
);

/** 파이핑 변형(PRD-M3 카테고리 3). */
export const pipingVariants: PipingVariant[] = [
  { id: 'dots', label: '도트' },
  { id: 'scallop', label: '스캘럽' },
  { id: 'star-tip', label: '별깍지' },
];

/** 레터링 폰트(PRD-M3 카테고리 2). */
export const letteringFonts: LetteringFont[] = [
  { value: "'Pretendard', system-ui, sans-serif", label: '기본' },
  { value: 'Georgia, "Times New Roman", serif', label: '세리프' },
  { value: '"Comic Sans MS", "Segoe Script", cursive', label: '손글씨' },
];

/** assetId로 일러스트 자산을 찾는다(없으면 undefined). */
export function illustrationAsset(assetId: string): IllustrationAsset | undefined {
  return illustrations.find((a) => a.id === assetId);
}

// ── 로컬 크기(스케일 1, 전개도 cm) ─────────────────────────────────
/** 일러스트 긴 변(cm). 비율에 맞춰 다른 변을 줄인다. */
export const ILLUSTRATION_SIZE = 14;
/** 파이핑 띠 높이(cm). */
export const PIPING_HEIGHT = 8;
/** 파이핑 모티프(반복 단위) 길이(cm). 런 길이를 이 값으로 나눠 반복 횟수를 정한다. */
export const PIPING_UNIT = 7;
/** 파이핑 런 최소 길이(cm) — 클릭만 해도 최소 한 모티프는 보이도록. */
export const MIN_PIPING_LENGTH = PIPING_UNIT;
/** 레터링 폰트 크기(cm)와 글자당 가로 비율. */
export const LETTER_FONT_CM = 9;
const LETTER_ASPECT = 0.62;

/** 전개도 로컬 크기(스케일 1, cm). 히트테스트·핸들 배치의 기준 박스. */
export function elementLocalSize(element: Element): { width: number; height: number } {
  switch (element.type) {
    case 'lettering': {
      const len = Math.max(1, element.text.length);
      return {
        width: Math.max(6, len * LETTER_FONT_CM * LETTER_ASPECT),
        height: LETTER_FONT_CM * 1.1,
      };
    }
    case 'piping':
      // 드래그한 런 길이가 곧 가로 폭.
      return { width: Math.max(MIN_PIPING_LENGTH, element.length), height: PIPING_HEIGHT };
    case 'illustration': {
      // 긴 변을 ILLUSTRATION_SIZE로 두고 비율대로 다른 변을 맞춘다.
      const aspect = illustrationAsset(element.assetId)?.aspect ?? 1;
      return aspect >= 1
        ? { width: ILLUSTRATION_SIZE, height: ILLUSTRATION_SIZE / aspect }
        : { width: ILLUSTRATION_SIZE * aspect, height: ILLUSTRATION_SIZE };
    }
    case 'drawing': {
      // 손그림(PRD-S1) — 점열의 경계 상자 치수(스케일 1). 점이 비면 0.
      if (element.points.length === 0) return { width: 0, height: 0 };
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const p of element.points) {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      }
      return { width: maxX - minX, height: maxY - minY };
    }
    case 'image': {
      // PRD-S4(별도 phase) — 안전한 기본 박스.
      return { width: ILLUSTRATION_SIZE, height: ILLUSTRATION_SIZE };
    }
  }
}
