// ui/theme — 디자인 토큰(케이크릿 목업 기준 파스텔 톤). 순수 상수, 도메인 비의존.
// 기능 폴더는 색·반경·그림자를 여기서 가져다 쓴다(하드코딩 금지).

export const palette = {
  /** 페이지 배경. */
  bg: '#fef6f4',
  /** 캔버스(전개도) 배경 — 연핑크. */
  canvas: '#fdeef0',
  /** 패널·카드·타일 표면. */
  surface: '#ffffff',
  /** 옅은 표면(보조). */
  surfaceMuted: '#faf3f4',
  /** 강조·활성 핑크. */
  primary: '#ef9aae',
  /** 강조 진한 핑크(호버). */
  primaryDeep: '#e87f97',
  /** 활성 항목 배경(연핑크). */
  primarySoft: '#fbe0e6',
  /** 케이크 바디 기본 시트색(따뜻한 크림). */
  sheet: '#fce8c8',
  /** 크림/스캘럽 기본색(핑크). */
  cream: '#f6c6d4',
  /** 본문 텍스트. */
  text: '#4a3a3a',
  /** 보조 텍스트. */
  textMuted: '#9b8585',
  /** 경계선. */
  border: '#f0e3e3',
} as const;

/** 크림색 팔레트(케이크 표면색 — 따뜻한 크림 + 파스텔). */
export const creamSwatches = [
  '#fce8c8',
  '#fff3b0',
  '#f6c6d4',
  '#f4a6b8',
  '#d7ebd0',
  '#cfe3f0',
] as const;

export const radius = {
  sm: '8px',
  md: '12px',
  lg: '18px',
  pill: '999px',
} as const;

export const shadow = {
  soft: '0 2px 8px rgba(180, 120, 120, 0.12)',
  card: '0 4px 16px rgba(180, 120, 120, 0.14)',
} as const;

export const fontStack =
  "'Pretendard', 'Apple SD Gothic Neo', system-ui, -apple-system, sans-serif";

/**
 * hex 색을 밝게(amount>0)/어둡게(amount<0) 조정한다(표현용 순수 함수).
 * #rgb·#rrggbb 입력만 지원하며, 그 외엔 원본을 그대로 돌려준다.
 */
export function shade(hex: string, amount: number): string {
  const m = hex.replace('#', '');
  const full = m.length === 3 ? m.replace(/(.)/g, '$1$1') : m;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return hex;
  const num = parseInt(full, 16);
  const adj = (c: number) => Math.round(Math.min(255, Math.max(0, c + amount * 255)));
  const r = adj((num >> 16) & 255);
  const g = adj((num >> 8) & 255);
  const b = adj(num & 255);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
