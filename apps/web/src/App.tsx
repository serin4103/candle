// App — 앱 셸(Phase 3). 상단 브랜드바 + 좌측(케이크·요소) + 중앙 전개도 편집기
// + 우측 속성 패널. 3D 토글(Phase 4), 공유(Phase 5)는 이후 채운다.
import { palette, fontStack, radius, shadow } from './ui';
import { CakeControls } from './cake';
import { NetEditor } from './editor2d/canvas';
import { LibraryPanel, PropertiesPanel } from './editor2d/panels';

export function App() {
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
      </header>

      {/* 본문: 좌측(케이크·요소) + 중앙 편집기 + 우측 속성 */}
      <main style={{ display: 'flex', flex: 1, gap: 20, padding: 20, minHeight: 0 }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            width: 260,
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
            padding: 24,
          }}
        >
          <NetEditor />
        </section>
        <div style={{ width: 260, overflowY: 'auto' }}>
          <PropertiesPanel />
        </div>
      </main>
    </div>
  );
}
