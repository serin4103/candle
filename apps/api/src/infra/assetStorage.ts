// infra/assetStorage — 업로드 이미지 바이트 저장소 어댑터(PRD-S4).
// DesignRepository와 같은 규율: 도메인(assets)이 인프라 세부(메모리·Supabase
// Storage)를 모르도록 인터페이스로 감싼다. 네트워크 스토리지를 위해 비동기.
import type { SupabaseClient } from '@supabase/supabase-js';

/** 저장된 원본 바이트와 그 mime. */
export interface StoredAsset {
  bytes: Uint8Array;
  mime: string;
}

/** 업로드 이미지 바이트 저장 계약. 메타(Asset)는 도메인이 따로 들고 있다. */
export interface AssetStorage {
  /** id로 바이트 저장(신규/덮어쓰기). */
  put(id: string, bytes: Uint8Array, mime: string): Promise<void>;
  /** id로 바이트 조회. 없으면 undefined. */
  get(id: string): Promise<StoredAsset | undefined>;
}

/** 인메모리 저장소(개발·테스트용, 프로세스 수명 동안만 유지). */
export function createInMemoryAssetStorage(): AssetStorage {
  const store = new Map<string, StoredAsset>();
  return {
    async put(id, bytes, mime) {
      store.set(id, { bytes, mime });
    },
    async get(id) {
      return store.get(id);
    },
  };
}

/**
 * Supabase Storage 기반 저장소. 비로그인 전제이므로 service_role로 접근하고
 * 접근 제어는 share 토큰이 담당한다. 버킷은 사전 생성 필요(기본 'assets').
 */
export function createSupabaseAssetStorage(
  client: SupabaseClient,
  bucket = 'assets',
): AssetStorage {
  return {
    async put(id, bytes, mime) {
      const { error } = await client.storage
        .from(bucket)
        .upload(id, bytes, { contentType: mime, upsert: true });
      if (error) throw new Error(`자산 저장 실패: ${error.message}`);
    },
    async get(id) {
      const { data, error } = await client.storage.from(bucket).download(id);
      if (error || !data) return undefined;
      const bytes = new Uint8Array(await data.arrayBuffer());
      return { bytes, mime: data.type || 'application/octet-stream' };
    },
  };
}
