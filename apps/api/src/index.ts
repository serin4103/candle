import Fastify, { type FastifyInstance } from 'fastify';
import {
  createInMemoryAssetStorage,
  createInMemoryRepository,
  createSupabaseAssetStorage,
  createSupabaseClient,
  createSupabaseRepository,
  type AssetStorage,
  type DesignRepository,
} from './infra';
import { createDesignService } from './designs';
import { createAssetService, registerAssetRoutes } from './assets';
import { registerDesignRoutes, registerErrorHandler } from './routes';

/**
 * 저장소를 환경에 따라 선택한다. SUPABASE_URL·SUPABASE_SERVICE_KEY가 있으면
 * Supabase(영속), 없으면 인메모리(개발용, 재시작 시 휘발).
 */
function createRepository(app: FastifyInstance): DesignRepository {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (url && key) {
    app.log.info('Supabase 저장소 사용');
    return createSupabaseRepository(createSupabaseClient(url, key));
  }
  app.log.warn(
    'SUPABASE_URL/SUPABASE_SERVICE_KEY 미설정 — 인메모리 저장소 사용(데이터가 영속되지 않음)',
  );
  return createInMemoryRepository();
}

/**
 * 업로드 이미지 바이트 저장소를 환경에 따라 선택한다(저장소와 같은 규칙).
 * Supabase면 Storage 버킷('assets'), 없으면 인메모리(개발용).
 */
function createAssetStorage(app: FastifyInstance): AssetStorage {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (url && key) {
    return createSupabaseAssetStorage(createSupabaseClient(url, key));
  }
  app.log.warn('자산 저장소: 인메모리 사용(업로드 이미지가 영속되지 않음)');
  return createInMemoryAssetStorage();
}

/**
 * 서버 인스턴스를 조립한다. 비로그인 전제이므로 인증 미들웨어는 없고,
 * 접근 제어는 share 토큰이 담당한다(PRD-M5).
 */
export function buildServer(): FastifyInstance {
  const app = Fastify({ logger: true });
  const repo = createRepository(app);
  const service = createDesignService(repo);
  const assetService = createAssetService(createAssetStorage(app));

  app.get('/health', async () => ({ status: 'ok', service: 'candle-api' }));
  registerDesignRoutes(app, service);
  registerAssetRoutes(app, assetService);
  registerErrorHandler(app);
  return app;
}

const port = Number(process.env.PORT ?? 3000);

async function start() {
  const app = buildServer();
  try {
    await app.listen({ port, host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

// 직접 실행할 때만 서버를 띄운다(테스트에서 import 시 listen 방지).
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  void start();
}
