// App — 앱 셸(Phase 2). 상단 브랜드바 + 좌측 cake 컨트롤 + 캔버스 전개도 프리뷰.
// 일러스트/레터링/파이핑(Phase 3), 3D 토글(Phase 4), 공유(Phase 5)는 이후 채운다.
import { palette, fontStack, radius, shadow } from './ui';
import { CakeControls } from './cake';
import { NetPreview } from './editor2d/canvas';

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

      {/* 본문: 좌측 컨트롤 + 캔버스 */}
      <main style={{ display: 'flex', flex: 1, gap: 20, padding: 20, minHeight: 0 }}>
        <CakeControls />
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
          <NetPreview />
        </section>
      </main>
    </div>
  );
}
