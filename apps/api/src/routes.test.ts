// 라우트 통합 테스트 — 인증 가드(401/403)와 열람 공유를 Fastify inject로 검증한다.
// dev 검증기(Bearer 토큰=userId) + 인메모리 저장소로 네트워크 없이 왕복한다.
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createInMemoryRepository } from './infra';
import { createDesignService } from './designs';
import { registerDesignRoutes, registerErrorHandler } from './routes';
import { registerAuth, createDevAuthVerifier } from './auth';

const DESIGN = {
  shape: 'circle',
  baseColor: '#f5d',
  creamColor: '#fff',
  spec: { size: 1, height: 7, layers: 1 },
  elements: [],
  decorations3d: [],
};

const auth = (user: string) => ({ authorization: `Bearer ${user}` });

describe('designs 라우트 (PRD-S6 인증)', () => {
  let app: FastifyInstance;

  beforeEach(() => {
    app = Fastify();
    registerAuth(app, createDevAuthVerifier());
    registerDesignRoutes(app, createDesignService(createInMemoryRepository()));
    registerErrorHandler(app);
  });
  afterEach(() => app.close());

  it('비로그인 저장은 401', async () => {
    const res = await app.inject({ method: 'POST', url: '/designs', payload: DESIGN });
    expect(res.statusCode).toBe(401);
  });

  it('로그인 저장 → 소유자 로드 200, 타인 403', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/designs',
      headers: auth('alice'),
      payload: DESIGN,
    });
    expect(created.statusCode).toBe(201);
    const { design } = created.json();

    const mine = await app.inject({ method: 'GET', url: `/designs/${design.id}`, headers: auth('alice') });
    expect(mine.statusCode).toBe(200);

    const others = await app.inject({ method: 'GET', url: `/designs/${design.id}`, headers: auth('bob') });
    expect(others.statusCode).toBe(403);
  });

  it('열람 토큰으로는 비로그인 열람이 가능하다', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/designs',
      headers: auth('alice'),
      payload: DESIGN,
    });
    const { shareLink } = created.json();
    const view = await app.inject({ method: 'GET', url: `/designs/by-view/${shareLink.viewToken}` });
    expect(view.statusCode).toBe(200);
    expect(view.json().design.creamColor).toBe('#fff');
  });

  it('마이페이지 목록은 로그인 필요(401) / 로그인 시 내 디자인', async () => {
    await app.inject({ method: 'POST', url: '/designs', headers: auth('alice'), payload: DESIGN });
    expect((await app.inject({ method: 'GET', url: '/designs' })).statusCode).toBe(401);
    const list = await app.inject({ method: 'GET', url: '/designs', headers: auth('alice') });
    expect(list.statusCode).toBe(200);
    expect(list.json().designs.length).toBe(1);
  });
});
