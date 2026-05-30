// api 라우트 — PRD-M5 저장·공유 + PRD-S6 소유권 엔드포인트. 도메인 로직은 designs
// 서비스로 위임하고, 여기서는 HTTP 매핑(상태코드·에러)과 인증 가드만 담당한다.
import type { FastifyInstance } from 'fastify';
import { DesignNotFoundError, type DesignService } from './designs';
import { PayloadTooLargeError, UnsupportedMediaTypeError } from './assets';
import { ForbiddenError, UnauthorizedError, requireUser } from './auth';

interface IdParams {
  id: string;
}
interface ViewTokenParams {
  viewToken: string;
}

/** 디자인 저장·공유 라우트를 등록한다. 편집은 소유권(로그인), 열람은 view 토큰. */
export function registerDesignRoutes(app: FastifyInstance, service: DesignService): void {
  // 저장(로그인 필요) → ownerId 귀속·열람 토큰 발급. design.id가 /d/:id가 된다.
  app.post('/designs', async (req, reply) => {
    const userId = requireUser(req);
    const { design, shareLink } = await service.create(req.body, userId);
    return reply.code(201).send({ design, shareLink });
  });

  // 내 디자인 목록(마이페이지, 로그인 필요)
  app.get('/designs', async (req) => {
    const userId = requireUser(req);
    return { designs: await service.listMine(userId) };
  });

  // 편집용 로드(소유자) — 열람 링크를 함께 돌려준다.
  app.get<{ Params: IdParams }>('/designs/:id', async (req) => {
    const userId = requireUser(req);
    return service.getById(req.params.id, userId);
  });

  // 소유자 수정 저장
  app.put<{ Params: IdParams }>('/designs/:id', async (req) => {
    const userId = requireUser(req);
    return { design: await service.updateById(req.params.id, userId, req.body) };
  });

  // 열람용 로드(비로그인 읽기)
  app.get<{ Params: ViewTokenParams }>('/designs/by-view/:viewToken', async (req) => {
    return { design: await service.getByView(req.params.viewToken) };
  });

  // 열람자의 복제(로그인 필요 — 복제본은 복제자 소유)
  app.post<{ Params: ViewTokenParams }>(
    '/designs/by-view/:viewToken/clone',
    async (req, reply) => {
      const userId = requireUser(req);
      const { design, shareLink } = await service.cloneByView(req.params.viewToken, userId);
      return reply.code(201).send({ design, shareLink });
    },
  );
}

/** 도메인 에러를 HTTP 상태로 매핑한다. */
export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: Error, _req, reply) => {
    // 인증·인가(PRD-S6): 비로그인 → 401, 소유자 아님 → 403.
    if (error instanceof UnauthorizedError) {
      return reply.code(401).send({ error: error.message });
    }
    if (error instanceof ForbiddenError) {
      return reply.code(403).send({ error: error.message });
    }
    if (error instanceof DesignNotFoundError) {
      return reply.code(404).send({ error: error.message });
    }
    // 업로드 검증(PRD-S4): 비허용 타입 → 415, 크기 초과 → 413.
    if (error instanceof UnsupportedMediaTypeError) {
      return reply.code(415).send({ error: error.message });
    }
    if (error instanceof PayloadTooLargeError) {
      return reply.code(413).send({ error: error.message });
    }
    // @fastify/multipart 파일 크기 초과(스트림 단계에서 던짐).
    if ((error as { code?: string }).code === 'FST_REQ_FILE_TOO_LARGE') {
      return reply.code(413).send({ error: '파일이 너무 큽니다 (최대 50MB).' });
    }
    // shared/schema(zod) 검증 실패 → 잘못된 요청.
    if (error.name === 'ZodError') {
      return reply.code(400).send({ error: '디자인 형식이 올바르지 않습니다.' });
    }
    app.log.error(error);
    return reply.code(500).send({ error: '서버 오류' });
  });
}
