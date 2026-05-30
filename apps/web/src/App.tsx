// App — 앱 셸. 상단 브랜드바(전개도↔3D 전환 + 로그인·저장·마이페이지) + 좌측(공유·
// 케이크·요소) + 중앙 뷰 + 우측 속성 패널. 열람 모드(PRD-M5)에선 편집 패널을 숨긴다.
// 상단바 버튼 "배치"는 셸의 책임이고, 로그인 팝업·세션은 auth/가 소유한다(PRD-S6).
import { useState } from 'react';
import { palette, fontStack, radius, shadow, Button } from './ui';
import { CakeControls } from './cake';
import { NetEditor } from './editor2d/canvas';
import { LibraryPanel, PropertiesPanel, DrawingPanel, PipingPanel } from './editor2d/panels';
import { useResolveImageAssets } from './editor2d/elements';
import { CakeViewer3D } from './viewer3d';
import { SharePanel, useShareSession, myPageUrl, navigate } from './share';
import { useAuthSession, LoginDialog, UserMenu } from './auth';
import { MyPage } from './mypage';

type ViewMode = 'net' | '3d';

export function App() {
  const auth = useAuthSession();
  // 로그인 세션 복원이 끝나야(토큰 세팅) /d/:id 소유자 로드가 401 없이 동작한다.
  const session = useShareSession(auth.status === 'ready');
  // 공유/복제로 진입했을 때 문서의 image 요소 자산을 서버에서 받아 채운다(PRD-S4).
  useResolveImageAssets();
  // 열람 링크 진입이면 편집 UI를 숨기고 3D 시안을 먼저 보여준다.
  const readOnly = session.mode === 'view';
  // 뷰 전환은 표현 상태(디자인 문서 아님) — App-local로 둔다.
  const [view, setView] = useState<ViewMode>(readOnly ? '3d' : 'net');
  // 로그인 팝업·사용자 메뉴 열림 상태(셸이 트리거·배치를 소유).
  const [loginOpen, setLoginOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // 마이페이지(PRD-S6)는 별도 전체 화면.
  if (session.mode === 'mypage') {
    return <MyPage session={auth} />;
  }

  const busy = session.status === 'saving' || session.status === 'loading';
  const saveLabel =
    session.status === 'saving' ? '저장 중…' : session.mode === 'design' ? '수정 저장' : '저장';

  // 저장: 비로그인이면 로그인 유도, 로그인했으면 신규 저장/수정 저장(PRD-S6).
  const onSave = () => {
    if (!auth.user) {
      setLoginOpen(true);
      return;
    }
    void (session.mode === 'design' ? session.update() : session.save());
  };

  return (
    <div
      style={{
        fontFamily: fontStack,
        minHeight: '100vh',
        background: palette.bg,
        color: palette.text,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 상단 브랜드바 */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 20px',
          background: palette.surface,
          boxShadow: shadow.soft,
        }}
      >
        <span
          style={{
            width: 32,
            height: 32,
            borderRadius: radius.md,
            background: palette.primarySoft,
            display: 'grid',
            placeItems: 'center',
            fontSize: 18,
          }}
        >
          🍰
        </span>
        <strong style={{ fontSize: 18 }}>candle</strong>
        <span style={{ color: palette.textMuted, fontSize: 14, marginLeft: 6 }}>
          내 케이크 디자인
        </span>

        {/* 전개도 ↔ 3D 전환 */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <Button
            active={view === 'net'}
            aria-pressed={view === 'net'}
            onClick={() => setView('net')}
          >
            전개도
          </Button>
          <Button active={view === '3d'} aria-pressed={view === '3d'} onClick={() => setView('3d')}>
            3D
          </Button>

          {/* 저장·마이페이지·로그인 (셸이 배치, 동작은 share·auth에 위임) */}
          {!readOnly && (
            <Button variant="primary" disabled={busy} onClick={onSave}>
              {saveLabel}
            </Button>
          )}
          <Button onClick={() => navigate(myPageUrl())}>마이페이지</Button>
          {auth.user ? (
            <Button onClick={() => setMenuOpen(true)} aria-label="사용자 메뉴">
              {auth.user.email ?? '내 계정'}
            </Button>
          ) : (
            <Button onClick={() => setLoginOpen(true)}>로그인</Button>
          )}
        </div>
      </header>

      {/* 본문: 좌측(케이크·요소) + 중앙 편집기 + 우측 속성 */}
      <main style={{ display: 'flex', flex: 1, gap: 16, padding: 16, minHeight: 0 }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            width: 228,
            flexShrink: 0,
            overflowY: 'auto',
          }}
        >
          <SharePanel session={session} />
          {/* 편집 패널(케이크 모양·요소·손그림 추가)은 전개도(2D) 뷰 전용 — 3D 뷰는 읽기 전용이라 숨긴다(PRD-M4). */}
          {!readOnly && view === 'net' && (
            <>
              <CakeControls />
              <LibraryPanel />
              <PipingPanel />
              <DrawingPanel />
            </>
          )}
        </div>
        <section
          style={{
            flex: 1,
            background: palette.canvas,
            borderRadius: radius.lg,
            boxShadow: shadow.card,
            display: 'grid',
            placeItems: 'center',
            padding: 16,
          }}
        >
          {view === 'net' ? <NetEditor /> : <CakeViewer3D />}
        </section>
        {/* 선택 요소 속성 패널도 2D 편집 전용 — 3D 읽기 전용 뷰에서는 숨긴다(PRD-M4). */}
        {!readOnly && view === 'net' && (
          <div style={{ width: 228, flexShrink: 0, overflowY: 'auto' }}>
            <PropertiesPanel />
          </div>
        )}
      </main>

      {/* 로그인/로그아웃 팝업 (auth/ 소유, 셸이 열고 닫음) */}
      {loginOpen && (
        <LoginDialog
          isConfigured={auth.isConfigured}
          onClose={() => setLoginOpen(false)}
          onSignIn={() => void auth.signInWithGoogle()}
        />
      )}
      {menuOpen && auth.user && (
        <UserMenu
          email={auth.user.email ?? ''}
          onSignOut={() => {
            void auth.signOut();
            setMenuOpen(false);
          }}
          onClose={() => setMenuOpen(false)}
        />
      )}
    </div>
  );
}
