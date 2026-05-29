// editor2d/elements/catalog — 요소 카탈로그와 로컬 크기 계산(Model, 순수).
// 라이브러리 패널이 제공하는 자산 목록과, 요소의 전개도 로컬 크기(스케일 1, cm)를
// 정의한다. 렌더 기술·상태 의존 없음 — tools(히트테스트/핸들)와 View가 함께 쓴다.
import type { Element } from '@candle/shared';

/** 일러스트 자산 — assetId로 참조하는 이모지 글리프. */
export interface IllustrationAsset {
  id: string;
  label: string;
  glyph: string;
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

/** 일러스트 라이브러리(PRD-M3 카테고리 1). */
export const illustrations: IllustrationAsset[] = [
  { id: 'strawberry', label: '딸기', glyph: '🍓' },
  { id: 'heart', label: '하트', glyph: '❤️' },
  { id: 'star', label: '별', glyph: '⭐' },
  { id: 'flower', label: '꽃', glyph: '🌸' },
  { id: 'cherry', label: '체리', glyph: '🍒' },
  { id: 'candle', label: '초', glyph: '🕯️' },
];

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

/** assetId → 글리프(없으면 케이크 기본). */
export function illustrationGlyph(assetId: string): string {
  return illustrations.find((a) => a.id === assetId)?.glyph ?? '🍰';
}

// ── 로컬 크기(스케일 1, 전개도 cm) ─────────────────────────────────
/** 일러스트 한 변(cm). */
export const ILLUSTRATION_SIZE = 14;
/** 파이핑 폭·높이(cm). */
export const PIPING_WIDTH = 20;
export const PIPING_HEIGHT = 8;
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
      return { width: PIPING_WIDTH, height: PIPING_HEIGHT };
    case 'illustration':
    case 'image':
      return { width: ILLUSTRATION_SIZE, height: ILLUSTRATION_SIZE };
    case 'drawing': {
      // Must 미사용 — 안전한 기본 박스.
      return { width: ILLUSTRATION_SIZE, height: ILLUSTRATION_SIZE };
    }
  }
}
