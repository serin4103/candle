// api 라우트 — PRD-M5 저장·공유 엔드포인트. 도메인 로직은 designs 서비스로
// 위임하고, 여기서는 HTTP 매핑(상태코드·에러)만 담당한다.
import type { FastifyInstance } from 'fastify';
import { DesignNotFoundError, type DesignService } from './designs';

interface TokenParams {
  editToken: string;
}
interface ViewTokenParams {
  viewToken: string;
}

/** 디자인 저장·공유 라우트를 등록한다. */
export function registerDesignRoutes(app: FastifyInstance, service: DesignService): void {
  // 저장 → 편집/열람 토큰 발급
  app.post('/designs', (req, reply) => {
    const { design, shareLink } = service.create(req.body);
    return reply.code(201).send({ design, shareLink });
  });

  // 편집용 로드(작성자) — 두 링크를 함께 돌려준다.
  app.get<{ Params: TokenParams }>('/designs/by-edit/:editToken', (req) => {
    return service.getByEdit(req.params.editToken);
  });

  // 열람용 로드(비로그인 읽기)
  app.get<{ Params: ViewTokenParams }>('/designs/by-view/:viewToken', (req) => {
    return { design: service.getByView(req.params.viewToken) };
  });

  // 작성자 수정 저장
  app.put<{ Params: TokenParams }>('/designs/by-edit/:editToken', (req) => {
    return { design: service.updateByEdit(req.params.editToken, req.body) };
  });

  // 열람자의 복제(새 편집/열람 토큰 발급)
  app.post<{ Params: ViewTokenParams }>('/designs/by-view/:viewToken/clone', (req, reply) => {
    const { design, shareLink } = service.cloneByView(req.params.viewToken);
    return reply.code(201).send({ design, shareLink });
  });
}

/** 도메인 에러를 HTTP 상태로 매핑한다. */
export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: Error, _req, reply) => {
    if (error instanceof DesignNotFoundError) {
      return reply.code(404).send({ error: error.message });
    }
    // shared/schema(zod) 검증 실패 → 잘못된 요청.
    if (error.name === 'ZodError') {
      return reply.code(400).send({ error: '디자인 형식이 올바르지 않습니다.' });
    }
    app.log.error(error);
    return reply.code(500).send({ error: '서버 오류' });
  });
}
