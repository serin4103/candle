// api — 백엔드 호출 클라이언트. UI·상태와 분리된 얇은 호출 계층(CLAUDE.md api 규칙).
// 요청/응답 타입은 packages/shared/schema를 재사용한다. 비즈니스 로직 없음.
import type { Asset, Design, ShareLink } from '@candle/shared';

/** 개발 시 Vite 프록시(/api → api 서버). 배포 시 VITE_API_BASE로 덮어쓴다. */
const BASE = import.meta.env.VITE_API_BASE ?? '/api';

/** 저장·복제 응답 — 문서와 발급된 두 링크. */
export interface SaveResult {
  design: Design;
  shareLink: ShareLink;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `요청 실패 (HTTP ${res.status})`);
  }
  return res.json() as Promise<T>;
}

/** 신규 저장 → 편집/열람 토큰 발급. */
export function saveDesign(design: Design): Promise<SaveResult> {
  return request('/designs', { method: 'POST', body: JSON.stringify(design) });
}

/** 편집 토큰으로 로드(작성자) — 문서와 두 링크를 함께 받는다. */
export function loadByEdit(editToken: string): Promise<SaveResult> {
  return request(`/designs/by-edit/${encodeURIComponent(editToken)}`);
}

/** 열람 토큰으로 로드(비로그인 읽기). */
export async function loadByView(viewToken: string): Promise<Design> {
  const { design } = await request<{ design: Design }>(
    `/designs/by-view/${encodeURIComponent(viewToken)}`,
  );
  return design;
}

/** 편집 토큰으로 작성자 수정 저장. */
export async function updateByEdit(editToken: string, design: Design): Promise<Design> {
  const { design: saved } = await request<{ design: Design }>(
    `/designs/by-edit/${encodeURIComponent(editToken)}`,
    { method: 'PUT', body: JSON.stringify(design) },
  );
  return saved;
}

/** 열람 토큰으로 복제 → 새 편집/열람 토큰. */
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
  const res = await fetch(`${BASE}/assets`, { method: 'POST', body: form });
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
