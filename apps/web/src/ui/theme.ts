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

/** 시트색 팔레트(스펀지·크림 톤). */
export const sheetSwatches = [
  '#fce8c8',
  '#f7e7d3',
  '#f3d9b5',
  '#e8c39e',
  '#fff7ea',
  '#ffffff',
] as const;

/** 크림색 팔레트(파스텔). */
export const creamSwatches = [
  '#f6c6d4',
  '#f4a6b8',
  '#fbe0e6',
  '#d7ebd0',
  '#cfe3f0',
  '#fff3b0',
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
