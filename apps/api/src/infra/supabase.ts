// infra/supabase — Supabase(Postgres) 기반 DesignRepository 구현.
// 서버는 service_role 키로 접근하고(편집 접근 제어는 소유권, 열람은 view 토큰),
// 도메인은 이 어댑터의 세부(테이블·SQL)를 모른다.
//
// 필요한 테이블(docs/supabase-schema.sql 참고):
//   designs(id text pk, owner_id text, doc jsonb)   -- owner_id = 작성자(PRD-S6)
//   tokens(token text pk, design_id text, role text)  -- 신규 발급은 'view'만
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { validateDesign, type Design, type ShareLink } from '@candle/shared';
import type { DesignRepository, TokenRole } from './repository';

/** 서버용 Supabase 클라이언트. 세션 유지 불필요(요청마다 무상태). */
export function createSupabaseClient(url: string, serviceKey: string): SupabaseClient {
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

export function createSupabaseRepository(client: SupabaseClient): DesignRepository {
  return {
    async saveDesign(design, ownerId) {
      const { error } = await client
        .from('designs')
        .upsert({ id: design.id, owner_id: ownerId, doc: design, updated_at: new Date().toISOString() });
      if (error) throw new Error(`디자인 저장 실패: ${error.message}`);
    },

    async getDesign(id) {
      const { data, error } = await client
        .from('designs')
        .select('doc')
        .eq('id', id)
        .maybeSingle();
      if (error) throw new Error(`디자인 조회 실패: ${error.message}`);
      if (!data) return undefined;
      // 저장 시 검증했더라도 로드 경계에서 다시 형식을 보장한다.
      return validateDesign((data as { doc: unknown }).doc);
    },

    async getOwner(id) {
      const { data, error } = await client
        .from('designs')
        .select('owner_id')
        .eq('id', id)
        .maybeSingle();
      if (error) throw new Error(`소유자 조회 실패: ${error.message}`);
      return (data as { owner_id: string } | null)?.owner_id;
    },

    async listDesignsByOwner(ownerId) {
      const { data, error } = await client
        .from('designs')
        .select('doc')
        .eq('owner_id', ownerId)
        .order('updated_at', { ascending: false });
      if (error) throw new Error(`디자인 목록 조회 실패: ${error.message}`);
      const rows = (data ?? []) as { doc: unknown }[];
      return rows.map((r): Design => validateDesign(r.doc));
    },

    async linkToken(token, designId, role) {
      const { error } = await client
        .from('tokens')
        .upsert({ token, design_id: designId, role });
      if (error) throw new Error(`토큰 연결 실패: ${error.message}`);
    },

    async resolveToken(token, role) {
      const { data, error } = await client
        .from('tokens')
        .select('design_id, role')
        .eq('token', token)
        .maybeSingle();
      if (error) throw new Error(`토큰 조회 실패: ${error.message}`);
      const row = data as { design_id: string; role: TokenRole } | null;
      // 역할이 일치할 때만 해석 — 열람 토큰으로 편집 경로 접근 불가.
      if (!row || row.role !== role) return undefined;
      return row.design_id;
    },

    async saveShareLink() {
      // 토큰은 linkToken으로 이미 tokens 테이블에 저장된다.
      // ShareLink는 getShareLink에서 tokens로부터 재구성하므로 별도 저장 불필요.
    },

    async getShareLink(designId): Promise<ShareLink | undefined> {
      const { data, error } = await client
        .from('tokens')
        .select('token, role')
        .eq('design_id', designId);
      if (error) throw new Error(`링크 조회 실패: ${error.message}`);
      const rows = (data ?? []) as { token: string; role: TokenRole }[];
      const viewToken = rows.find((r) => r.role === 'view')?.token;
      if (!viewToken) return undefined;
      return { designId, viewToken };
    },
  };
}
