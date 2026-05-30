// auth/useAuthSession — 로그인 세션 훅(PRD-S6). Supabase 세션을 구독해 현재 사용자와
// access token을 들고, api 호출 계층에 토큰을 주입한다(setAuthToken). 로그인/로그아웃
// 명령을 제공한다. 디자인 문서 상태는 store가 소유 — 여기는 세션 표현용.
import { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { setAuthToken } from '../api';
import { isAuthConfigured, supabase } from './supabaseClient';

export interface AuthSession {
  /** 로그인 사용자(없으면 null). */
  user: User | null;
  /** 세션 복원 중이면 'loading', 끝나면 'ready'. */
  status: 'loading' | 'ready';
  /** Supabase 설정 여부(미설정이면 로그인 불가 — 안내). */
  isConfigured: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

export function useAuthSession(): AuthSession {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready'>(
    isAuthConfigured ? 'loading' : 'ready',
  );

  useEffect(() => {
    if (!supabase) {
      setStatus('ready');
      return;
    }
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(data.session?.user ?? null);
      setAuthToken(data.session?.access_token ?? null);
      setStatus('ready');
    });
    // 로그인/로그아웃·토큰 갱신을 구독해 사용자와 api 토큰을 동기화한다.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthToken(session?.access_token ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return;
    // 로그인 후 현재 화면으로 돌아온다(편집 중이던 디자인 유지).
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.href },
    });
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  return { user, status, isConfigured: isAuthConfigured, signInWithGoogle, signOut };
}
