// auth/UserMenu — 로그인 상태 사용자 메뉴(View). 상단바 사용자 버튼(App 셸)이 여는
// 드롭다운. 이메일 표시 + 로그아웃. 바깥 클릭으로 닫힌다.
import { palette, radius, shadow, fontStack, Button } from '../ui';

export interface UserMenuProps {
  email: string;
  onSignOut: () => void;
  onClose: () => void;
}

export function UserMenu({ email, onSignOut, onClose }: UserMenuProps) {
  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 100 }}
    >
      <div
        role="menu"
        aria-label="사용자 메뉴"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          top: 56,
          right: 20,
          fontFamily: fontStack,
          width: 240,
          background: palette.surface,
          border: `1px solid ${palette.border}`,
          borderRadius: radius.md,
          boxShadow: shadow.card,
          padding: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <span style={{ fontSize: 12, color: palette.textMuted }}>로그인됨</span>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: palette.text,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {email}
        </span>
        <Button onClick={onSignOut} aria-label="로그아웃">
          로그아웃
        </Button>
      </div>
    </div>
  );
}
