// App — 앱 셸. 상단 브랜드바(+전개도↔3D 전환) + 좌측(공유·케이크·요소) + 중앙 뷰
// + 우측 속성 패널. 열람 모드(PRD-M5)에선 편집 패널을 숨기고 공유 패널만 둔다.
import { useState } from 'react';
import { palette, fontStack, radius, shadow, Button } from './ui';
import { CakeControls } from './cake';
import { NetEditor } from './editor2d/canvas';
import { LibraryPanel, PropertiesPanel } from './editor2d/panels';
import { CakeViewer3D } from './viewer3d';
import { SharePanel, useShareSession } from './share';

type ViewMode = 'net' | '3d';

export function App() {
  const session = useShareSession();
  // 열람 링크 진입이면 편집 UI를 숨기고 3D 시안을 먼저 보여준다.
  const readOnly = session.mode === 'view';
  // 뷰 전환은 표현 상태(디자인 문서 아님) — App-local로 둔다.
  const [view, setView] = useState<ViewMode>(readOnly ? '3d' : 'net');

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
          <Button
            active={view === '3d'}
            aria-pressed={view === '3d'}
            onClick={() => setView('3d')}
          >
            3D
          </Button>
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
          {!readOnly && (
            <>
              <CakeControls />
              <LibraryPanel />
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
        {!readOnly && (
          <div style={{ width: 228, flexShrink: 0, overflowY: 'auto' }}>
            <PropertiesPanel />
          </div>
        )}
      </main>
    </div>
  );
}
