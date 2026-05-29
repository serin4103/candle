// share — 토큰 발급. 인증 모듈을 대신하는 접근 제어 핵심(CLAUDE.md share 규칙).
// 토큰은 추측 불가능해야 하므로 암호학적 난수로 생성한다.
import { randomBytes } from 'node:crypto';
import type { ShareLink } from '@candle/shared';

/** 추측 불가능한 URL-safe 토큰(192bit base64url). */
export function generateToken(): string {
  return randomBytes(24).toString('base64url');
}

/**
 * 편집·열람 토큰을 발급한다. 두 토큰은 항상 서로 다른 고유 값이며,
 * 각각 다른 권한(편집/열람)을 가진다(PRD-M5).
 */
export function issueShareLink(designId: string): ShareLink {
  return {
    designId,
    editToken: generateToken(),
    viewToken: generateToken(),
  };
}
