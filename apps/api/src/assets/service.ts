// assets — 이미지 업로드 도메인 로직(PRD-S4). 타입·크기를 경계에서 검증하고
// 바이트는 infra(AssetStorage)에 저장한 뒤 Asset 메타를 만든다. 검수(내용 심사)는
// 없다(PRD 명시) — 확장자/mime과 크기만 막는다. 영속화 세부는 infra가 가린다.
import { randomUUID } from 'node:crypto';
import type { Asset } from '@candle/shared';
import type { AssetStorage, StoredAsset } from '../infra';
import { imageDimensions, imageKindForMime } from './imageDimensions';

/** 업로드 허용 최대 크기 — PRD-S4: 50MB. */
export const MAX_ASSET_BYTES = 50 * 1024 * 1024;

/** 허용되지 않는 mime(PNG/JPG/SVG 외) — 라우트에서 415로 매핑. */
export class UnsupportedMediaTypeError extends Error {
  constructor(message = '허용되지 않는 이미지 형식입니다 (PNG·JPG·SVG).') {
    super(message);
    this.name = 'UnsupportedMediaTypeError';
  }
}

/** 50MB 초과 — 라우트에서 413으로 매핑. */
export class PayloadTooLargeError extends Error {
  constructor(message = '파일이 너무 큽니다 (최대 50MB).') {
    super(message);
    this.name = 'PayloadTooLargeError';
  }
}

/** 업로드 입력 — 라우트가 multipart에서 읽어 넘긴 원본 바이트와 mime. */
export interface UploadInput {
  bytes: Uint8Array;
  mime: string;
}

export interface AssetService {
  /** 검증 → 저장 → Asset 메타 반환. */
  upload(input: UploadInput): Promise<Asset>;
  /** 원본 바이트 조회(라우트의 GET /assets/:id/raw). 없으면 undefined. */
  get(id: string): Promise<StoredAsset | undefined>;
}

export function createAssetService(storage: AssetStorage): AssetService {
  return {
    async upload({ bytes, mime }) {
      // 경계 검증: 형식 먼저, 그다음 크기(검수는 없음 — PRD).
      if (!imageKindForMime(mime)) throw new UnsupportedMediaTypeError();
      if (bytes.byteLength > MAX_ASSET_BYTES) throw new PayloadTooLargeError();

      const id = randomUUID();
      await storage.put(id, bytes, mime);
      const { width, height } = imageDimensions(bytes, mime);
      // url은 원본 바이트 라우트의 서버 경로. 클라이언트가 BASE를 접두한다.
      const asset: Asset = {
        id,
        url: `/assets/${id}/raw`,
        mime,
        width,
        height,
        sizeBytes: bytes.byteLength,
      };
      return asset;
    },

    get(id) {
      return storage.get(id);
    },
  };
}
