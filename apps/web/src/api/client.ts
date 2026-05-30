// api — 백엔드 호출 클라이언트. UI·상태와 분리된 얇은 호출 계층(CLAUDE.md api 규칙).
// 요청/응답 타입은 packages/shared/schema를 재사용한다. 비즈니스 로직 없음.
import type { Asset, Design, ShareLink } from '@candle/shared';

/** 개발 시 Vite 프록시(/api → api 서버). 배포 시 VITE_API_BASE로 덮어쓴다. */
const BASE = import.meta.env.VITE_API_BASE ?? '/api';

/**
 * 현재 로그인 세션의 access token. auth 세션이 변경 시 setAuthToken으로 주입한다.
 * 여기 두는 이유: api 호출 계층은 React에 의존하지 않으므로(얇은 함수) 모듈 변수로
 * 토큰을 들고 모든 요청 헤더에 싣는다.
 */
let authToken: string | null = null;

/** auth 세션이 로그인/로그아웃 시 토큰을 갱신한다(PRD-S6). */
export function setAuthToken(token: string | null): void {
  authToken = token;
}

/** 인증 헤더(토큰이 있으면). */
function authHeaders(): Record<string, string> {
  return authToken ? { authorization: `Bearer ${authToken}` } : {};
}

/** 저장·복제·로드 응답 — 문서와 발급된 열람 링크. */
export interface SaveResult {
  design: Design;
  shareLink: ShareLink;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...authHeaders(), ...init?.headers },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `요청 실패 (HTTP ${res.status})`);
  }
  return res.json() as Promise<T>;
}

/** 신규 저장(로그인 필요) → 디자인 id 부여·열람 토큰 발급. */
export function saveDesign(design: Design): Promise<SaveResult> {
  return request('/designs', { method: 'POST', body: JSON.stringify(design) });
}

/** 내 디자인 목록(마이페이지, 로그인 필요). */
export async function listMyDesigns(): Promise<Design[]> {
  const { designs } = await request<{ designs: Design[] }>('/designs');
  return designs;
}

/** id로 로드(소유자) — 문서와 열람 링크를 함께 받는다. */
export function loadById(id: string): Promise<SaveResult> {
  return request(`/designs/${encodeURIComponent(id)}`);
}

/** 소유자 수정 저장. */
export async function updateById(id: string, design: Design): Promise<Design> {
  const { design: saved } = await request<{ design: Design }>(
    `/designs/${encodeURIComponent(id)}`,
    { method: 'PUT', body: JSON.stringify(design) },
  );
  return saved;
}

/** 열람 토큰으로 로드(비로그인 읽기). */
export async function loadByView(viewToken: string): Promise<Design> {
  const { design } = await request<{ design: Design }>(
    `/designs/by-view/${encodeURIComponent(viewToken)}`,
  );
  return design;
}

/** 열람 토큰으로 복제(로그인 필요) → 새 디자인·새 열람 토큰(복제자 소유). */
export function cloneByView(viewToken: string): Promise<SaveResult> {
  return request(`/designs/by-view/${encodeURIComponent(viewToken)}/clone`, {
    method: 'POST',
  });
}

/**
 * 이미지 업로드(PRD-S4). multipart라 content-type은 브라우저가 boundary와 함께
 * 자동 설정하므로 직접 지정하지 않는다. 검증(타입·크기)은 서버 경계에서 한다.
 */
export async function uploadAsset(file: File): Promise<Asset> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${BASE}/assets`, {
    method: 'POST',
    body: form,
    headers: authHeaders(),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `업로드 실패 (HTTP ${res.status})`);
  }
  return res.json() as Promise<Asset>;
}

/** 자산 원본 바이트의 절대 URL. 디자인 문서는 assetId만 들고 있으므로 id로 구성한다. */
export function assetRawSrc(assetId: string): string {
  return `${BASE}/assets/${encodeURIComponent(assetId)}/raw`;
}
