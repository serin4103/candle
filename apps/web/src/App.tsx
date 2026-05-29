// App — 앱 셸. 상단 브랜드바(+전개도↔3D 전환) + 좌측(케이크·요소) + 중앙 뷰
// + 우측 속성 패널. 공유(Phase 5)는 이후 채운다.
import { useState } from 'react';
import { palette, fontStack, radius, shadow, Button } from './ui';
import { CakeControls } from './cake';
import { NetEditor } from './editor2d/canvas';
import { LibraryPanel, PropertiesPanel } from './editor2d/panels';
import { CakeViewer3D } from './viewer3d';

type ViewMode = 'net' | '3d';

export function App() {
  // 뷰 전환은 표현 상태(디자인 문서 아님) — App-local로 둔다.
  const [view, setView] = useState<ViewMode>('net');

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
          <CakeControls />
          <LibraryPanel />
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
        <div style={{ width: 228, flexShrink: 0, overflowY: 'auto' }}>
          <PropertiesPanel />
        </div>
      </main>
    </div>
  );
}
