// auth/plugin — 요청마다 Authorization: Bearer 토큰을 검증해 req.userId를 채운다.
// 토큰이 없거나 무효면 userId는 null(여기서 차단하지 않음). 로그인이 필수인
// 라우트는 requireUser로 userId를 보장한다(없으면 401). 열람 라우트는 비인증 허용.
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { AuthVerifier } from './verifier';
import { UnauthorizedError } from './errors';

declare module 'fastify' {
  interface FastifyRequest {
    /** 검증된 로그인 사용자 id. 비로그인/무효 토큰이면 null. */
    userId: string | null;
  }
}

/** req.userId 데코레이터와 토큰 해석 훅을 등록한다. */
export function registerAuth(app: FastifyInstance, verifier: AuthVerifier): void {
  app.decorateRequest('userId', null);
  app.addHook('onRequest', async (req) => {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : '';
    req.userId = token ? await verifier.verify(token) : null;
  });
}

/** 로그인 필수 핸들러에서 userId를 보장한다. 비로그인이면 UnauthorizedError(401). */
export function requireUser(req: FastifyRequest): string {
  if (!req.userId) throw new UnauthorizedError();
  return req.userId;
}
