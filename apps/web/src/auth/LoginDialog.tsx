// auth/LoginDialog — 로그인 팝업(View). Google 로그인 트리거를 담은 모달.
// 상단바의 로그인 버튼(App 셸)이 이 팝업을 연다. Supabase 미설정 시 안내만.
import { palette, radius, shadow, fontStack, Button } from '../ui';

export interface LoginDialogProps {
  onClose: () => void;
  onSignIn: () => void;
  isConfigured: boolean;
}

export function LoginDialog({ onClose, onSignIn, isConfigured }: LoginDialogProps) {
  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(74, 58, 58, 0.35)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 100,
      }}
    >
      <div
        role="dialog"
        aria-label="로그인"
        onClick={(e) => e.stopPropagation()}
        style={{
          fontFamily: fontStack,
          width: 320,
          background: palette.surface,
          borderRadius: radius.lg,
          boxShadow: shadow.card,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          textAlign: 'center',
        }}
      >
        <strong style={{ fontSize: 18, color: palette.text }}>candle 로그인</strong>
        <p style={{ margin: 0, fontSize: 13, color: palette.textMuted, lineHeight: 1.5 }}>
          로그인하면 디자인을 저장하고 마이페이지에서 다시 열어 편집할 수 있어요.
        </p>
        {isConfigured ? (
          <Button variant="primary" onClick={onSignIn} aria-label="Google로 로그인">
            Google로 계속하기
          </Button>
        ) : (
          <p style={{ margin: 0, fontSize: 12, color: palette.primaryDeep }}>
            로그인이 아직 설정되지 않았습니다 (VITE_SUPABASE_URL·ANON_KEY 필요).
          </p>
        )}
        <Button onClick={onClose}>닫기</Button>
      </div>
    </div>
  );
}
