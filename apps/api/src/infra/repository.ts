// infra — 영속화 어댑터. 도메인(designs·share)이 인프라 세부를 모르도록
// 저장소를 인터페이스로 감싼다(CLAUDE.md infra 규칙). DB 미구축 단계라
// 인메모리 구현을 둔다. 추후 DB 어댑터로 교체 시 도메인은 무변경.
import type { Design, ShareLink } from '@candle/shared';

/** 토큰 권한 — 편집 토큰만 원본 수정 가능, 열람 토큰은 읽기·복제만. */
export type TokenRole = 'edit' | 'view';

/**
 * 디자인 문서·토큰 영속화 계약. 토큰→designId 해석은 역할별로 분리해
 * 열람 토큰으로 편집 경로에 접근할 수 없게 한다.
 */
export interface DesignRepository {
  /** 디자인 저장(신규/덮어쓰기). */
  saveDesign(design: Design): void;
  /** id로 디자인 조회. 없으면 undefined. */
  getDesign(id: string): Design | undefined;
  /** 토큰을 designId에 역할과 함께 연결. */
  linkToken(token: string, designId: string, role: TokenRole): void;
  /** 토큰을 해석해 designId 반환(역할 일치 시에만). 불일치/없음이면 undefined. */
  resolveToken(token: string, role: TokenRole): string | undefined;
  /** 디자인의 발급 링크 저장. */
  saveShareLink(link: ShareLink): void;
  /** designId의 발급 링크 조회. 없으면 undefined. */
  getShareLink(designId: string): ShareLink | undefined;
}

/** 인메모리 저장소. 프로세스 수명 동안만 유지(개발·MVP용). */
export function createInMemoryRepository(): DesignRepository {
  const designs = new Map<string, Design>();
  const tokens = new Map<string, { designId: string; role: TokenRole }>();
  const shareLinks = new Map<string, ShareLink>();

  return {
    saveDesign(design) {
      designs.set(design.id, design);
    },
    getDesign(id) {
      return designs.get(id);
    },
    linkToken(token, designId, role) {
      tokens.set(token, { designId, role });
    },
    resolveToken(token, role) {
      const entry = tokens.get(token);
      if (!entry || entry.role !== role) return undefined;
      return entry.designId;
    },
    saveShareLink(link) {
      shareLinks.set(link.designId, link);
    },
    getShareLink(designId) {
      return shareLinks.get(designId);
    },
  };
}
