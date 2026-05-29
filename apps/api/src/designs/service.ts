// designs — 디자인 문서 도메인 로직(PRD-M5). 저장·조회·복제와 토큰 발급을
// 조율한다. 영속화는 infra 저장소를 통해(비동기), 토큰은 share를 통해 한다.
// 저장·로드 경계에서 항상 shared/schema로 형식을 검증한다.
import { randomUUID } from 'node:crypto';
import { validateDesign, type Design, type ShareLink } from '@candle/shared';
import type { DesignRepository } from '../infra';
import { issueShareLink } from '../share';

/** 디자인을 찾지 못했을 때(토큰 무효/만료 등). 라우트에서 404로 매핑. */
export class DesignNotFoundError extends Error {
  constructor(message = '디자인을 찾을 수 없습니다.') {
    super(message);
    this.name = 'DesignNotFoundError';
  }
}

/** 저장·복제 결과 — 문서와 발급된 두 링크. */
export interface CreateResult {
  design: Design;
  shareLink: ShareLink;
}

export interface DesignService {
  /** 신규 저장 — 서버 id 부여 후 검증·저장하고 편집/열람 토큰 발급. */
  create(input: unknown): Promise<CreateResult>;
  /** 편집 토큰으로 로드(작성자용). 작성자에겐 두 링크를 함께 돌려준다. */
  getByEdit(editToken: string): Promise<CreateResult>;
  /** 열람 토큰으로 로드(읽기). 편집 토큰은 노출하지 않는다. */
  getByView(viewToken: string): Promise<Design>;
  /** 편집 토큰으로 작성자 수정 저장. id는 원본 유지. */
  updateByEdit(editToken: string, input: unknown): Promise<Design>;
  /** 열람 토큰으로 복제 — 새 id·새 토큰으로 독립 디자인 생성. */
  cloneByView(viewToken: string): Promise<CreateResult>;
}

/** 입력을 서버 id로 강제한 뒤 검증해 저장하고 토큰을 발급하는 공통 경로. */
async function persistNew(repo: DesignRepository, input: unknown): Promise<CreateResult> {
  const id = randomUUID();
  // 클라이언트가 보낸 id를 신뢰하지 않고 서버가 부여(클론 독립성·충돌 방지).
  const design = validateDesign({ ...(input as object), id });
  await repo.saveDesign(design);
  const shareLink = issueShareLink(id);
  await repo.linkToken(shareLink.editToken, id, 'edit');
  await repo.linkToken(shareLink.viewToken, id, 'view');
  await repo.saveShareLink(shareLink);
  return { design, shareLink };
}

export function createDesignService(repo: DesignRepository): DesignService {
  async function requireDesign(token: string, role: 'edit' | 'view'): Promise<Design> {
    const id = await repo.resolveToken(token, role);
    const design = id ? await repo.getDesign(id) : undefined;
    if (!design) throw new DesignNotFoundError();
    return design;
  }

  return {
    create(input) {
      return persistNew(repo, input);
    },

    async getByEdit(editToken) {
      const design = await requireDesign(editToken, 'edit');
      const shareLink = await repo.getShareLink(design.id);
      if (!shareLink) throw new DesignNotFoundError();
      return { design, shareLink };
    },

    getByView(viewToken) {
      return requireDesign(viewToken, 'view');
    },

    async updateByEdit(editToken, input) {
      const existing = await requireDesign(editToken, 'edit');
      // 본문 id를 무시하고 원본 id로 고정 — 편집은 같은 문서를 덮어쓴다.
      const design = validateDesign({ ...(input as object), id: existing.id });
      await repo.saveDesign(design);
      return design;
    },

    async cloneByView(viewToken) {
      const source = await requireDesign(viewToken, 'view');
      // 원본을 복제하되 새 id·새 토큰으로 완전히 독립된 디자인을 만든다.
      return persistNew(repo, source);
    },
  };
}
