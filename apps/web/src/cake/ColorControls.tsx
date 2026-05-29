// cake/ColorControls — 시트색·크림색 선택(PRD-M2). View → store 색상 액션 위임.
import { ColorPicker, sheetSwatches, creamSwatches, palette } from '../ui';
import { useDesignStore } from '../document/store';

export function ColorControls() {
  const baseColor = useDesignStore((s) => s.design.baseColor);
  const creamColor = useDesignStore((s) => s.design.creamColor);
  const setBaseColor = useDesignStore((s) => s.setBaseColor);
  const setCreamColor = useDesignStore((s) => s.setCreamColor);

  const labelStyle = {
    fontSize: 13,
    fontWeight: 600,
    color: palette.textMuted,
    margin: '0 0 6px',
  } as const;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <p style={labelStyle}>시트색</p>
        <ColorPicker
          label="시트색"
          value={baseColor}
          swatches={sheetSwatches}
          onChange={setBaseColor}
        />
      </div>
      <div>
        <p style={labelStyle}>크림색</p>
        <ColorPicker
          label="크림색"
          value={creamColor}
          swatches={creamSwatches}
          onChange={setCreamColor}
        />
      </div>
    </div>
  );
}
