// auth/verifier — Bearer 토큰 → userId 검증을 추상화한다(CLAUDE.md 레이어 경계:
// 인증 세부를 여기 격리, 도메인은 userId만 받는다). 프로덕션은 Supabase Auth로
// 검증하고, Supabase 미설정 로컬/테스트는 주입형 dev 검증기를 쓴다.
import type { SupabaseClient } from '@supabase/supabase-js';

export interface AuthVerifier {
  /** Bearer 토큰을 검증해 userId를 반환. 무효/만료면 null. */
  verify(token: string): Promise<string | null>;
}

/**
 * Supabase Auth access token 검증(프로덕션). 토큰으로 사용자를 조회해 id를 얻는다.
 * 네트워크 호출이지만 별도 시크릿·JWT 라이브러리 없이 정확하다.
 */
export function createSupabaseAuthVerifier(client: SupabaseClient): AuthVerifier {
  return {
    async verify(token) {
      const { data, error } = await client.auth.getUser(token);
      if (error || !data.user) return null;
      return data.user.id;
    },
  };
}

/**
 * 개발/테스트용 검증기 — 실제 OAuth 없이 **Bearer 토큰 문자열을 그대로 userId로**
 * 신뢰한다(예: `Authorization: Bearer alice` → userId 'alice'). Supabase 미설정
 * 로컬 환경·테스트 전용이며, 프로덕션(SUPABASE_URL 설정 시)에서는 쓰이지 않는다.
 */
export function createDevAuthVerifier(): AuthVerifier {
  return {
    async verify(token) {
      return token.length > 0 ? token : null;
    },
  };
}
