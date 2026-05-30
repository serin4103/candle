// share — 열람 토큰 발급. 비로그인 열람 공유의 접근 제어 핵심(CLAUDE.md share 규칙).
// 편집 권한은 소유권(PRD-S6)으로 제어하므로 편집 토큰은 발급하지 않는다.
// 토큰은 추측 불가능해야 하므로 암호학적 난수로 생성한다.
import { randomBytes } from 'node:crypto';
import type { ShareLink } from '@candle/shared';

/** 추측 불가능한 URL-safe 토큰(192bit base64url). */
export function generateToken(): string {
  return randomBytes(24).toString('base64url');
}

/**
 * 열람 토큰을 발급한다(PRD-M5). 비로그인 열람·복제에 쓰인다. 편집 링크는
 * 발급하지 않는다 — 편집은 소유권(ownerId)으로 제어한다(PRD-S6).
 */
export function issueShareLink(designId: string): ShareLink {
  return {
    designId,
    viewToken: generateToken(),
  };
}
