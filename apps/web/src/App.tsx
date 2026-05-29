// 부트스트랩 골격. Phase 2~4에서 cake/editor2d/viewer3d 레이아웃으로 대체된다.
export function App() {
  return (
    <main
      style={{
        fontFamily: 'system-ui, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: '0.5rem',
        color: '#3a2a2a',
      }}
    >
      <h1 style={{ margin: 0 }}>🍰 candle</h1>
      <p style={{ margin: 0, opacity: 0.7 }}>
        케이크 3D 시안 디자인 도구 — 부트스트랩 완료 (Phase 0)
      </p>
    </main>
  );
}
