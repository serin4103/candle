// designs — 디자인 문서 도메인 로직(PRD-M5 저장·공유, PRD-S6 소유권).
// 저장·조회·복제와 열람 토큰 발급을 조율한다. 편집 권한은 소유권(ownerId)으로
// 제어하고, 열람 공유는 view 토큰으로 한다. 영속화는 infra, 인증 판단은 라우트가
// 넘긴 userId로 한다(검증은 auth가 끝낸 뒤). 저장·로드 경계에서 schema로 검증.
import { randomUUID } from 'node:crypto';
import { validateDesign, type Design, type ShareLink } from '@candle/shared';
import type { DesignRepository } from '../infra';
import { issueShareLink } from '../share';
import { ForbiddenError } from '../auth';

/** 디자인을 찾지 못했을 때(id/토큰 무효 등). 라우트에서 404로 매핑. */
export class DesignNotFoundError extends Error {
  constructor(message = '디자인을 찾을 수 없습니다.') {
    super(message);
    this.name = 'DesignNotFoundError';
  }
}

/** 저장·복제 결과 — 문서와 발급된 열람 링크. */
export interface CreateResult {
  design: Design;
  shareLink: ShareLink;
}

export interface DesignService {
  /** 신규 저장 — 서버 id 부여 후 검증·저장하고 ownerId 귀속·열람 토큰 발급. */
  create(input: unknown, ownerId: string): Promise<CreateResult>;
  /** id로 로드(소유자 전용). 소유자에겐 열람 링크를 함께 돌려준다. */
  getById(id: string, userId: string): Promise<CreateResult>;
  /** 소유자 수정 저장. id는 원본 유지. */
  updateById(id: string, userId: string, input: unknown): Promise<Design>;
  /** 내 디자인 목록(마이페이지). */
  listMine(userId: string): Promise<Design[]>;
  /** 열람 토큰으로 로드(비로그인 읽기). */
  getByView(viewToken: string): Promise<Design>;
  /** 열람 토큰으로 복제 — 새 id·새 토큰의 독립 디자인을 복제자(ownerId) 소유로 생성. */
  cloneByView(viewToken: string, ownerId: string): Promise<CreateResult>;
}

/** 입력을 서버 id로 강제·검증해 저장하고(소유자 귀속) 열람 토큰을 발급하는 공통 경로. */
async function persistNew(
  repo: DesignRepository,
  input: unknown,
  ownerId: string,
): Promise<CreateResult> {
  const id = randomUUID();
  // 클라이언트가 보낸 id를 신뢰하지 않고 서버가 부여(클론 독립성·충돌 방지).
  const design = validateDesign({ ...(input as object), id });
  await repo.saveDesign(design, ownerId);
  const shareLink = issueShareLink(id);
  await repo.linkToken(shareLink.viewToken, id, 'view');
  await repo.saveShareLink(shareLink);
  return { design, shareLink };
}

export function createDesignService(repo: DesignRepository): DesignService {
  /** 소유자 검증 후 디자인 반환. 없으면 404, 소유자 아니면 403. */
  async function requireOwned(id: string, userId: string): Promise<Design> {
    const design = await repo.getDesign(id);
    if (!design) throw new DesignNotFoundError();
    const owner = await repo.getOwner(id);
    if (owner !== userId) throw new ForbiddenError();
    return design;
  }

  /** 열람 토큰 → 디자인(읽기). 없으면 404. */
  async function loadByView(viewToken: string): Promise<Design> {
    const id = await repo.resolveToken(viewToken, 'view');
    const design = id ? await repo.getDesign(id) : undefined;
    if (!design) throw new DesignNotFoundError();
    return design;
  }

  return {
    create(input, ownerId) {
      return persistNew(repo, input, ownerId);
    },

    async getById(id, userId) {
      const design = await requireOwned(id, userId);
      const shareLink = await repo.getShareLink(id);
      if (!shareLink) throw new DesignNotFoundError();
      return { design, shareLink };
    },

    async updateById(id, userId, input) {
      await requireOwned(id, userId);
      // 본문 id를 무시하고 원본 id로 고정 — 편집은 같은 문서를 덮어쓴다.
      const design = validateDesign({ ...(input as object), id });
      await repo.saveDesign(design, userId);
      return design;
    },

    listMine(userId) {
      return repo.listDesignsByOwner(userId);
    },

    getByView(viewToken) {
      return loadByView(viewToken);
    },

    async cloneByView(viewToken, ownerId) {
      const source = await loadByView(viewToken);
      // 원본을 복제하되 새 id·새 토큰으로 복제자 소유의 독립 디자인을 만든다.
      return persistNew(repo, source, ownerId);
    },
  };
}
