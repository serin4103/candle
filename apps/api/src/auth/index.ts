// auth — 인증·인가 엔트리 (PRD-S6).
export { UnauthorizedError, ForbiddenError } from './errors';
export {
  createSupabaseAuthVerifier,
  createDevAuthVerifier,
  type AuthVerifier,
} from './verifier';
export { registerAuth, requireUser } from './plugin';
