// editor2d/elements/catalog — 요소 카탈로그와 로컬 크기 계산(Model, 순수).
// 라이브러리 패널이 제공하는 자산 목록과, 요소의 전개도 로컬 크기(스케일 1, cm)를
// 정의한다. 렌더 기술·상태 의존 없음 — tools(히트테스트/핸들)와 View가 함께 쓴다.
import type { Element } from '@candle/shared';
import catFaceUrl from './assets/cat-face.svg';

/** 일러스트 자산 — assetId로 참조하는 SVG 자산(Vite URL import). */
export interface IllustrationAsset {
  id: string;
  label: string;
  /** 렌더용 SVG URL. */
  src: string;
  /** 가로÷세로 비율(원본 viewBox 기준). 배치 크기 산정에 쓴다. */
  aspect: number;
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

/** 일러스트 라이브러리(PRD-M3 카테고리 1). SVG 자산을 추가하려면
 *  `assets/`에 파일을 넣고 import 후 이 배열에 한 줄 추가한다. */
export const illustrations: IllustrationAsset[] = [
  { id: 'cat-face', label: '고양이', src: catFaceUrl, aspect: 1130 / 1090 },
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

/** assetId로 일러스트 자산을 찾는다(없으면 undefined). */
export function illustrationAsset(assetId: string): IllustrationAsset | undefined {
  return illustrations.find((a) => a.id === assetId);
}

// ── 로컬 크기(스케일 1, 전개도 cm) ─────────────────────────────────
/** 일러스트 긴 변(cm). 비율에 맞춰 다른 변을 줄인다. */
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
    case 'illustration': {
      // 긴 변을 ILLUSTRATION_SIZE로 두고 비율대로 다른 변을 맞춘다.
      const aspect = illustrationAsset(element.assetId)?.aspect ?? 1;
      return aspect >= 1
        ? { width: ILLUSTRATION_SIZE, height: ILLUSTRATION_SIZE / aspect }
        : { width: ILLUSTRATION_SIZE * aspect, height: ILLUSTRATION_SIZE };
    }
    case 'image':
    case 'drawing': {
      // Must 미사용 — 안전한 기본 박스.
      return { width: ILLUSTRATION_SIZE, height: ILLUSTRATION_SIZE };
    }
  }
}
