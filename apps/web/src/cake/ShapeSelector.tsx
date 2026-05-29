// cake/ShapeSelector — 시트 모양 3종 선택(PRD-M1). View → store.setShape 위임.
import type { Shape } from '@candle/shared';
import { Button, palette } from '../ui';
import { useDesignStore } from '../document/store';

const SHAPES: { value: Shape; label: string; glyph: string }[] = [
  { value: 'circle', label: '원형', glyph: '●' },
  { value: 'square', label: '사각형', glyph: '■' },
  { value: 'heart', label: '하트', glyph: '♥' },
];

export function ShapeSelector() {
  const shape = useDesignStore((s) => s.design.shape);
  const setShape = useDesignStore((s) => s.setShape);

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {SHAPES.map((s) => (
        <Button
          key={s.value}
          active={shape === s.value}
          onClick={() => setShape(s.value)}
          aria-pressed={shape === s.value}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            padding: '12px 8px',
          }}
        >
          <span style={{ fontSize: 22, color: palette.primaryDeep }}>{s.glyph}</span>
          <span>{s.label}</span>
        </Button>
      ))}
    </div>
  );
}
