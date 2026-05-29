// share/route — 공유 링크 경로 파싱·생성. 라우터 의존 없이 location 기반으로
// 동작한다(비로그인 전제, 경로 = 접근 토큰). 순수 표현 보조.

/** 진입 모드 — 신규 작성 / 작성자 편집 / 비로그인 열람. */
export type ShareMode = 'new' | 'edit' | 'view';

export interface RouteInfo {
  mode: ShareMode;
  token: string | null;
}

/** `/edit/:token`·`/view/:token`을 해석한다. 그 외는 신규 작성. */
export function parseRoute(pathname: string = window.location.pathname): RouteInfo {
  const match = pathname.match(/^\/(edit|view)\/([^/]+)\/?$/);
  if (match && match[1] && match[2]) {
    return { mode: match[1] as 'edit' | 'view', token: decodeURIComponent(match[2]) };
  }
  return { mode: 'new', token: null };
}

/** 편집 링크 URL. */
export function editUrl(editToken: string): string {
  return `${window.location.origin}/edit/${encodeURIComponent(editToken)}`;
}

/** 열람 링크 URL. */
export function viewUrl(viewToken: string): string {
  return `${window.location.origin}/view/${encodeURIComponent(viewToken)}`;
}

/** 전체 리로드로 다른 링크로 이동(진입 시 디자인 재적재). */
export function navigate(url: string): void {
  window.location.assign(url);
}

/** 주소만 교체(리로드 없음) — 저장 후 현재 화면을 편집 링크로 승격할 때. */
export function replaceUrl(url: string): void {
  window.history.replaceState(null, '', url);
}
