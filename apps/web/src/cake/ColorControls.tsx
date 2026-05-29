// cake/ColorControls — 크림색 선택(PRD-M2). View → store.setCreamColor 위임.
// 시트색 선택은 사용자 요청으로 제거(케이크 표면색=크림색만 노출).
import { ColorPicker, creamSwatches, palette } from '../ui';
import { useDesignStore } from '../document/store';

export function ColorControls() {
  const creamColor = useDesignStore((s) => s.design.creamColor);
  const setCreamColor = useDesignStore((s) => s.setCreamColor);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <p
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: palette.textMuted,
          margin: '0 0 6px',
        }}
      >
        크림색
      </p>
      <ColorPicker
        label="크림색"
        value={creamColor}
        swatches={creamSwatches}
        onChange={setCreamColor}
      />
    </div>
  );
}
