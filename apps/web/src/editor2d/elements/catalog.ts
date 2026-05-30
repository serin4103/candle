// editor2d/elements/catalog — 요소 카탈로그와 로컬 크기 계산(Model, 순수).
// 라이브러리 패널이 제공하는 자산 목록과, 요소의 전개도 로컬 크기(스케일 1, cm)를
// 정의한다. 렌더 기술·상태 의존 없음 — tools(히트테스트/핸들)와 View가 함께 쓴다.
import type { Element } from '@candle/shared';
import { getImageAsset } from './imageAssets';

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

/** id(파일명)별 한국어 라벨. 없는 파일은 파일명을 사람이 읽기 좋게 변환해 쓴다. */
const ILLUSTRATION_LABELS: Record<string, string> = {
  'cat-face': '고양이',
  'dog-face': '강아지',
  'bear-heart': '곰',
  'bubble': '거품',
  'clover': '클로버',
  'fish': '물고기',
  'flower': '꽃',
  'heart': '하트',
  'music-note': '음표',
  'ribbon-bow': '리본',
  'soap-bubble': '비눗방울',
  'sparkle': '반짝이',
  'star': '별',
  'tomato': '토마토',
  'tree': '나무',
};

/** 파일명(확장자·경로 제거)을 라벨로 변환: 'music-note' → 'Music note'. */
function labelFromId(id: string): string {
  const words = id.replace(/[-_]+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * `assets/`의 모든 SVG를 빌드 시점에 텍스트로 읽어들인다(Vite glob).
 * 파일을 추가하면 자동으로 일러스트 목록에 잡힌다 — 코드 수정 불필요.
 * 라벨만 한국어로 보이게 하려면 위 ILLUSTRATION_LABELS에 한 줄 추가한다.
 */
const ILLUSTRATION_RAW = import.meta.glob<string>('./assets/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
});

/** 일러스트 라이브러리(PRD-M3 카테고리 1). `assets/`에 SVG 파일만 넣으면 자동 등록된다. */
export const illustrations: IllustrationAsset[] = Object.entries(ILLUSTRATION_RAW)
  .map(([path, raw]) => {
    // './assets/music-note.svg' → 'music-note'
    const id = path.slice(path.lastIndexOf('/') + 1).replace(/\.svg$/i, '');
    return {
      id,
      label: ILLUSTRATION_LABELS[id] ?? labelFromId(id),
      raw,
      aspect: aspectFromSvg(raw),
      palette: extractColors(raw),
    };
  })
  .sort((a, b) => a.id.localeCompare(b.id));

/** 파이핑 변형(PRD-M3 카테고리 3). 별모양 제거, 물방울 추가. */
export const pipingVariants: PipingVariant[] = [
  { id: 'dots', label: '원형' },
  { id: 'scallop', label: '스캘럽' },
  { id: 'teardrop', label: '물방울' },
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
/** 파이핑 기본 굵기(cm) — width 미지정 시 보강값. 모티프(점/물방울) 지름·스캘럽 두께. */
export const DEFAULT_PIPING_WIDTH = 1;
/** 파이핑 굵기 범위(cm). */
export const MIN_PIPING_WIDTH = 0.2;
export const MAX_PIPING_WIDTH = 2;
/** 레터링 폰트 크기(cm)와 글자당 가로 비율. */
export const LETTER_FONT_CM = 3;
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
    case 'piping': {
      // 곡선 경로의 경계 상자 + 모티프 굵기만큼 여유(점이 경로 밖으로 굵기/2 만큼 번짐).
      const w = element.width ?? DEFAULT_PIPING_WIDTH;
      if (element.points.length === 0) return { width: w, height: w };
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const p of element.points) {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      }
      return { width: maxX - minX + w, height: maxY - minY + w };
    }
    case 'illustration': {
      // 긴 변을 ILLUSTRATION_SIZE로 두고 비율대로 다른 변을 맞춘다.
      const aspect = illustrationAsset(element.assetId)?.aspect ?? 1;
      return aspect >= 1
        ? { width: ILLUSTRATION_SIZE, height: ILLUSTRATION_SIZE / aspect }
        : { width: ILLUSTRATION_SIZE * aspect, height: ILLUSTRATION_SIZE };
    }
    case 'image': {
      // 업로드 이미지(PRD-S4): 레지스트리의 원본 치수로 종횡비를 맞춘다.
      const asset = getImageAsset(element.assetId);
      const aspect = asset && asset.width > 0 && asset.height > 0 ? asset.width / asset.height : 1;
      return aspect >= 1
        ? { width: ILLUSTRATION_SIZE, height: ILLUSTRATION_SIZE / aspect }
        : { width: ILLUSTRATION_SIZE * aspect, height: ILLUSTRATION_SIZE };
    }
    case 'drawing': {
      // 손그림(PRD-S1) — 점열 경계 상자 + 획 굵기만큼 여유(번짐 + 직선 획도 선택 가능).
      const w = element.width;
      if (element.points.length === 0) return { width: w, height: w };
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const p of element.points) {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      }
      return { width: maxX - minX + w, height: maxY - minY + w };
    }
  }
}
