// auth 검증기 단위 테스트 — 네트워크 없이 검증 로직만 확인한다.
import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createDevAuthVerifier, createSupabaseAuthVerifier } from './verifier';

/** getUser 응답만 흉내내는 최소 Supabase 클라이언트 스텁. */
function stubClient(result: {
  data: { user: { id: string } | null };
  error: { message: string } | null;
}): SupabaseClient {
  return { auth: { getUser: async () => result } } as unknown as SupabaseClient;
}

describe('AuthVerifier', () => {
  it('dev 검증기는 Bearer 토큰 문자열을 그대로 userId로 신뢰한다', async () => {
    const v = createDevAuthVerifier();
    expect(await v.verify('alice')).toBe('alice');
    expect(await v.verify('')).toBeNull();
  });

  it('supabase 검증기는 getUser 결과의 user.id를 반환한다', async () => {
    const v = createSupabaseAuthVerifier(stubClient({ data: { user: { id: 'u1' } }, error: null }));
    expect(await v.verify('tok')).toBe('u1');
  });

  it('supabase 검증기는 error 또는 사용자 없음이면 null', async () => {
    const err = createSupabaseAuthVerifier(
      stubClient({ data: { user: null }, error: { message: 'invalid' } }),
    );
    expect(await err.verify('tok')).toBeNull();
    const none = createSupabaseAuthVerifier(stubClient({ data: { user: null }, error: null }));
    expect(await none.verify('tok')).toBeNull();
  });
});
