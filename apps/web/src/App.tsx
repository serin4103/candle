// App — 앱 셸. 상단 브랜드바(공유·저장·마이페이지·로그인) + 좌측(케이크·요소) +
// 중앙 뷰(케이크 위 전개도↔3D 세그먼트 스위치) + 우측 속성 패널. 열람 모드(PRD-M5)
// 에선 편집 패널을 숨긴다. 상단바 버튼 "배치"는 셸의 책임이고, 공유 모달은 share/,
// 로그인 팝업·세션은 auth/가 소유한다(PRD-S6). 마이페이지는 로그인 시에만 노출.
import { useState, type ReactNode } from 'react';
import { palette, fontStack, radius, shadow, Button, Panel } from './ui';
import { CakeControls, ColorControls } from './cake';
import { NetEditor } from './editor2d/canvas';
import { LibraryPanel, PropertiesPanel, DrawingPanel } from './editor2d/panels';
import { useResolveImageAssets } from './editor2d/elements';
import { useDesignStore } from './document/store';
import { useUndoRedoShortcuts } from './document/history/useUndoRedoShortcuts';
import { CakeViewer3D } from './viewer3d';
import { ShareModal, useShareSession, myPageUrl, navigate } from './share';
import { useAuthSession, LoginDialog, UserMenu } from './auth';
import { MyPage, prefetchMyDesigns } from './mypage';

type ViewMode = 'net' | '3d';

/** 전개도 아이콘(격자). */
function NetIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="1.5" y="1.5" width="13" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M1.5 6.5h13M6 6.5v8" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

/** 3D 아이콘(큐브). */
function CubeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8 1.6 14 5v6L8 14.4 2 11V5L8 1.6Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M2 5l6 3.4L14 5M8 8.4v6" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

/** 전개도 ↔ 3D 세그먼트 스위치. 활성 항목만 흰 알약으로 떠오른다. */
function ViewToggle({ view, onChange }: { view: ViewMode; onChange: (v: ViewMode) => void }) {
  const segments: { id: ViewMode; label: string; icon: ReactNode }[] = [
    { id: 'net', label: '전개도', icon: <NetIcon /> },
    { id: '3d', label: '3D', icon: <CubeIcon /> },
  ];
  return (
    <div
      role="tablist"
      aria-label="뷰 전환"
      style={{
        display: 'inline-flex',
        gap: 4,
        padding: 4,
        borderRadius: radius.pill,
        background: palette.surfaceMuted,
        border: `1px solid ${palette.border}`,
      }}
    >
      {segments.map((seg) => {
        const active = view === seg.id;
        return (
          <button
            key={seg.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(seg.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: fontStack,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              borderRadius: radius.pill,
              padding: '7px 16px',
              transition: 'all 0.15s ease',
              background: active ? palette.surface : 'transparent',
              color: active ? palette.text : palette.textMuted,
              boxShadow: active ? shadow.soft : 'none',
            }}
          >
            {seg.icon}
            {seg.label}
          </button>
        );
      })}
    </div>
  );
}

/** 되돌리기 아이콘(좌향 곡선 화살표). */
function UndoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M5 5H9.5a3.5 3.5 0 0 1 0 7H6M5 5l2.5-2.5M5 5l2.5 2.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** 다시 실행 아이콘(우향 곡선 화살표). */
function RedoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M11 5H6.5a3.5 3.5 0 0 0 0 7H10M11 5L8.5 2.5M11 5L8.5 7.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** 되돌리기/다시실행 버튼 묶음. canUndo/canRedo를 구독해 disabled를 토글한다(View). */
function UndoRedoControls() {
  const canUndo = useDesignStore((s) => s.canUndo);
  const canRedo = useDesignStore((s) => s.canRedo);
  const undo = useDesignStore((s) => s.undo);
  const redo = useDesignStore((s) => s.redo);
  const iconBtn = { padding: '8px 10px', display: 'inline-flex', alignItems: 'center' } as const;
  return (
    <div style={{ display: 'inline-flex', gap: 4 }}>
      <Button aria-label="되돌리기" title="되돌리기 (Ctrl/⌘+Z)" disabled={!canUndo} onClick={undo} style={iconBtn}>
        <UndoIcon />
      </Button>
      <Button
        aria-label="다시 실행"
        title="다시 실행 (Ctrl/⌘+Shift+Z)"
        disabled={!canRedo}
        onClick={redo}
        style={iconBtn}
      >
        <RedoIcon />
      </Button>
    </div>
  );
}

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
  // undo/redo 단축키는 편집 맥락(전개도 뷰)에서만. 3D 읽기 전용/열람 모드에선 비활성(PRD-M4).
  const editing = !readOnly && view === 'net';
  useUndoRedoShortcuts(editing);
  // 로그인 팝업·사용자 메뉴 열림 상태(셸이 트리거·배치를 소유).
  const [loginOpen, setLoginOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

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

        {/* 공유·저장·마이페이지·로그인 (셸이 배치, 동작은 share·auth에 위임) */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {/* 공유 버튼은 저장 후(열람 링크 발급) 노출. 열람 모드는 복제 진입을 위해 유지. */}
          {(readOnly || session.shareLink) && (
            <Button onClick={() => setShareOpen(true)}>공유</Button>
          )}
          {!readOnly && (
            <Button variant="primary" disabled={busy} onClick={onSave}>
              {saveLabel}
            </Button>
          )}
          {/* 마이페이지는 로그인 사용자에게만 노출(PRD-S6). 리로드 전에 hover/누름으로
              목록을 미리 받아 캐시에 채워, 진입 시 빈 화면 없이 즉시 뜨게 한다. */}
          {auth.user && (
            <Button
              onMouseEnter={() => prefetchMyDesigns(auth.user!.id)}
              onFocus={() => prefetchMyDesigns(auth.user!.id)}
              onPointerDown={() => prefetchMyDesigns(auth.user!.id)}
              onClick={() => navigate(myPageUrl())}
            >
              마이페이지
            </Button>
          )}
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
          {/* 편집 패널(케이크 모양·요소·손그림 추가)은 전개도(2D) 뷰 전용 — 3D 뷰는 읽기 전용이라 숨긴다(PRD-M4). */}
          {!readOnly && view === 'net' && (
            <>
              <CakeControls />
              <LibraryPanel />
              <DrawingPanel />
            </>
          )}
          {/* 3D 뷰에서는 크림색 색상 선택만 남긴다(색은 3D에 즉시 반영, PRD-M2). */}
          {!readOnly && view === '3d' && (
            <Panel title="색상">
              <ColorControls />
            </Panel>
          )}
        </div>
        <section
          style={{
            flex: 1,
            background: palette.canvas,
            borderRadius: radius.lg,
            boxShadow: shadow.card,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
            padding: 16,
            minHeight: 0,
          }}
        >
          {/* 전개도 ↔ 3D 전환 — 케이크 위쪽에 세그먼트 스위치로 둔다(상단바 아님).
              되돌리기/다시실행은 편집(전개도) 뷰에서만 좌측에 둔다(PRD-C2). */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {editing && (
              <div style={{ position: 'absolute', left: 0 }}>
                <UndoRedoControls />
              </div>
            )}
            <ViewToggle view={view} onChange={setView} />
          </div>
          <div
            style={{
              flex: 1,
              minHeight: 0,
              width: '100%',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            {view === 'net' ? <NetEditor /> : <CakeViewer3D />}
          </div>
        </section>
        {/* 선택 요소 속성 패널도 2D 편집 전용 — 3D 읽기 전용 뷰에서는 숨긴다(PRD-M4). */}
        {!readOnly && view === 'net' && (
          <div style={{ width: 228, flexShrink: 0, overflowY: 'auto' }}>
            <PropertiesPanel />
          </div>
        )}
      </main>

      {/* 공유 모달 (share/ 소유, 상단바 "공유" 버튼이 열고 닫음) */}
      {shareOpen && <ShareModal session={session} onClose={() => setShareOpen(false)} />}

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
