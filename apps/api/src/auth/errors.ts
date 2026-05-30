// auth/errors — 인증·인가 도메인 에러. 라우트 에러 핸들러가 HTTP로 매핑한다
// (UnauthorizedError → 401, ForbiddenError → 403).

/** 로그인하지 않았거나 토큰이 무효함. */
export class UnauthorizedError extends Error {
  constructor(message = '로그인이 필요합니다.') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

/** 로그인했지만 해당 리소스에 대한 권한이 없음(소유자 아님). */
export class ForbiddenError extends Error {
  constructor(message = '권한이 없습니다.') {
    super(message);
    this.name = 'ForbiddenError';
  }
}
