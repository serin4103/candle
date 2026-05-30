// auth/supabaseClient — 브라우저용 Supabase 클라이언트(PRD-S6).
// 환경변수(VITE_SUPABASE_URL·VITE_SUPABASE_ANON_KEY)로 구성한다. 미설정이면
// 로그인 UI는 "설정 필요" 안내만 한다(로컬에서 로그인 없이도 편집은 가능).
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Supabase Auth가 설정됐는지(환경변수 존재 여부). */
export const isAuthConfigured: boolean = Boolean(url && anonKey);

/** 브라우저 Supabase 클라이언트. 미설정이면 null. */
export const supabase: SupabaseClient | null = isAuthConfigured
  ? createClient(url as string, anonKey as string)
  : null;
