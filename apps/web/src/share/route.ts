// share/route — 경로 파싱·생성. 라우터 의존 없이 location 기반으로 동작한다.
// 편집은 소유 디자인 `/d/:id`(로그인), 열람 공유는 `/view/:token`(비로그인),
// 마이페이지는 `/mypage`. 그 외는 신규 작성. 순수 표현 보조.

/** 진입 모드 — 신규 작성 / 소유 디자인 편집 / 비로그인 열람 / 마이페이지. */
export type ShareMode = 'new' | 'design' | 'view' | 'mypage';

export interface RouteInfo {
  mode: ShareMode;
  /** 열람 토큰(view 모드). */
  token: string | null;
  /** 디자인 id(design 모드). */
  id: string | null;
}

/** `/d/:id`·`/view/:token`·`/mypage`를 해석한다. 그 외는 신규 작성. */
export function parseRoute(pathname: string = window.location.pathname): RouteInfo {
  const view = pathname.match(/^\/view\/([^/]+)\/?$/);
  if (view && view[1]) {
    return { mode: 'view', token: decodeURIComponent(view[1]), id: null };
  }
  const design = pathname.match(/^\/d\/([^/]+)\/?$/);
  if (design && design[1]) {
    return { mode: 'design', token: null, id: decodeURIComponent(design[1]) };
  }
  if (/^\/mypage\/?$/.test(pathname)) {
    return { mode: 'mypage', token: null, id: null };
  }
  return { mode: 'new', token: null, id: null };
}

/** 소유 디자인 편집 URL(`/d/:id`). */
export function designUrl(id: string): string {
  return `${window.location.origin}/d/${encodeURIComponent(id)}`;
}

/** 열람 링크 URL(`/view/:token`). */
export function viewUrl(viewToken: string): string {
  return `${window.location.origin}/view/${encodeURIComponent(viewToken)}`;
}

/** 마이페이지 URL. */
export function myPageUrl(): string {
  return `${window.location.origin}/mypage`;
}

/** 전체 리로드로 다른 경로로 이동(진입 시 디자인 재적재). */
export function navigate(url: string): void {
  window.location.assign(url);
}

/** 주소만 교체(리로드 없음) — 저장 후 현재 화면을 `/d/:id`로 승격할 때. */
export function replaceUrl(url: string): void {
  window.history.replaceState(null, '', url);
}
