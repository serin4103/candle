// auth — 로그인 세션·팝업 엔트리 (PRD-S6).
export { isAuthConfigured, supabase } from './supabaseClient';
export { useAuthSession, type AuthSession } from './useAuthSession';
export { LoginDialog, type LoginDialogProps } from './LoginDialog';
export { UserMenu, type UserMenuProps } from './UserMenu';
