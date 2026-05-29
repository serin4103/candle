// assets/routes — 이미지 업로드·원본 제공 라우트(PRD-S4). 도메인 검증·저장은
// AssetService로 위임하고, 여기서는 HTTP 매핑(multipart 파싱·상태코드)만 한다.
import type { FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';
import { MAX_ASSET_BYTES, type AssetService } from './service';

interface RawParams {
  id: string;
}

/** 업로드(POST /assets)·원본(GET /assets/:id/raw) 라우트를 등록한다. */
export function registerAssetRoutes(app: FastifyInstance, service: AssetService): void {
  // 파일 크기 상한을 multipart 단계에서 강제(초과 시 던져 413으로 매핑).
  app.register(multipart, {
    limits: { fileSize: MAX_ASSET_BYTES, files: 1 },
    throwFileSizeLimit: true,
  });

  app.post('/assets', async (req, reply) => {
    const data = await req.file();
    if (!data) {
      return reply.code(400).send({ error: '파일이 없습니다.' });
    }
    const buffer = await data.toBuffer();
    const asset = await service.upload({
      bytes: new Uint8Array(buffer),
      mime: data.mimetype,
    });
    return reply.code(201).send(asset);
  });

  app.get<{ Params: RawParams }>('/assets/:id/raw', async (req, reply) => {
    const stored = await service.get(req.params.id);
    if (!stored) {
      return reply.code(404).send({ error: '자산을 찾을 수 없습니다.' });
    }
    // 캐시 가능(불변 자산) — 같은 id는 같은 바이트.
    return reply
      .header('content-type', stored.mime)
      .header('cache-control', 'public, max-age=31536000, immutable')
      .send(Buffer.from(stored.bytes));
  });
}
