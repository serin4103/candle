// assets 업로드 테스트(PRD-S4) — 완료 기준 "PNG·JPG·SVG 업로드 / 50MB·비허용 거부"를
// 직접 증명한다. 도메인은 서비스 단위로, HTTP 상태(201/413/415)는 Fastify inject로.
import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import { createInMemoryAssetStorage } from '../infra';
import {
  createAssetService,
  registerAssetRoutes,
  MAX_ASSET_BYTES,
  UnsupportedMediaTypeError,
  PayloadTooLargeError,
} from './index';
import { registerErrorHandler } from '../routes';

/** 최소 PNG(시그니처 + IHDR 16x16). */
function pngBytes(): Uint8Array {
  const b = new Uint8Array(24);
  b.set([137, 80, 78, 71, 13, 10, 26, 10], 0);
  const view = new DataView(b.buffer);
  view.setUint32(16, 16);
  view.setUint32(20, 16);
  return b;
}

function buildApp() {
  const app = Fastify();
  const service = createAssetService(createInMemoryAssetStorage());
  registerAssetRoutes(app, service);
  registerErrorHandler(app);
  return app;
}

/** 단일 파일 multipart 바디를 손으로 구성한다(form-data 의존 없이). */
function multipart(bytes: Uint8Array, mime: string, filename: string) {
  const boundary = '----candletest';
  const head = Buffer.from(
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
      `Content-Type: ${mime}\r\n\r\n`,
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  const payload = Buffer.concat([head, Buffer.from(bytes), tail]);
  return { payload, headers: { 'content-type': `multipart/form-data; boundary=${boundary}` } };
}

describe('AssetService (PRD-S4)', () => {
  it('비허용 mime은 UnsupportedMediaTypeError', async () => {
    const service = createAssetService(createInMemoryAssetStorage());
    await expect(service.upload({ bytes: new Uint8Array([1]), mime: 'image/gif' })).rejects.toBeInstanceOf(
      UnsupportedMediaTypeError,
    );
  });

  it('50MB 초과는 PayloadTooLargeError', async () => {
    const service = createAssetService(createInMemoryAssetStorage());
    const big = new Uint8Array(MAX_ASSET_BYTES + 1);
    big.set([137, 80, 78, 71], 0); // png 시그니처(타입 검증은 통과)
    await expect(service.upload({ bytes: big, mime: 'image/png' })).rejects.toBeInstanceOf(
      PayloadTooLargeError,
    );
  });

  it('PNG 업로드 → Asset 메타(치수·크기) 반환 후 바이트 보존', async () => {
    const service = createAssetService(createInMemoryAssetStorage());
    const bytes = pngBytes();
    const asset = await service.upload({ bytes, mime: 'image/png' });
    expect(asset.id).toBeTruthy();
    expect(asset.mime).toBe('image/png');
    expect(asset).toMatchObject({ width: 16, height: 16, sizeBytes: bytes.byteLength });
    expect(asset.url).toBe(`/assets/${asset.id}/raw`);
    const stored = await service.get(asset.id);
    expect(stored?.bytes).toEqual(bytes);
  });
});

describe('asset routes (HTTP 매핑)', () => {
  it('PNG 업로드는 201 + Asset, GET raw는 같은 바이트', async () => {
    const app = buildApp();
    const bytes = pngBytes();
    const res = await app.inject({ method: 'POST', url: '/assets', ...multipart(bytes, 'image/png', 'a.png') });
    expect(res.statusCode).toBe(201);
    const asset = res.json() as { id: string; url: string };
    const raw = await app.inject({ method: 'GET', url: `/assets/${asset.id}/raw` });
    expect(raw.statusCode).toBe(200);
    expect(raw.headers['content-type']).toContain('image/png');
    expect(new Uint8Array(raw.rawPayload)).toEqual(bytes);
    await app.close();
  });

  it('비허용 타입은 415', async () => {
    const app = buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/assets',
      ...multipart(new Uint8Array([1, 2, 3]), 'image/gif', 'a.gif'),
    });
    expect(res.statusCode).toBe(415);
    await app.close();
  });

  it('50MB 초과는 413', async () => {
    const app = buildApp();
    const big = new Uint8Array(MAX_ASSET_BYTES + 10);
    big.set([137, 80, 78, 71], 0);
    const res = await app.inject({
      method: 'POST',
      url: '/assets',
      ...multipart(big, 'image/png', 'big.png'),
    });
    expect(res.statusCode).toBe(413);
    await app.close();
  });

  it('없는 자산 raw는 404', async () => {
    const app = buildApp();
    const res = await app.inject({ method: 'GET', url: '/assets/nope/raw' });
    expect(res.statusCode).toBe(404);
    await app.close();
  });
});
