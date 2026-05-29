import Fastify from 'fastify';

const fastify = Fastify({ logger: true });

// 부트스트랩 헬스체크. Phase 5(PRD-M5)에서 designs/share/assets 라우트를 등록한다.
fastify.get('/health', async () => ({ status: 'ok', service: 'candle-api' }));

const port = Number(process.env.PORT ?? 3000);

async function start() {
  try {
    await fastify.listen({ port, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

void start();
