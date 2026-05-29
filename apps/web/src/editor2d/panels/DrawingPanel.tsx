// editor2d/panels/DrawingPanel — 손그림 도구 UI(View, PRD-S1).
// 펜/지우개 토글, 브러시 굵기·색상 선택. 입력은 store 액션으로 위임만 하고
// 계산·상태는 store가 보유한다(패널에 편집 로직 금지).
import { useDesignStore } from '../../document/store';
import { Panel, Button, ColorPicker, palette } from '../../ui';

/** 브러시 색 스와치 — 크림 위에서 잘 보이는 기본 색들. */
const BRUSH_SWATCHES = ['#5a3b3b', '#e87f97', '#3b6ea5', '#4a8c5f', '#222222'] as const;
/** 굵기 범위(전개도 cm). */
const MIN_WIDTH = 0.5;
const MAX_WIDTH = 8;

export function DrawingPanel() {
  const drawingTool = useDesignStore((s) => s.drawingTool);
  const brush = useDesignStore((s) => s.brush);
  const setDrawingTool = useDesignStore((s) => s.setDrawingTool);
  const setBrush = useDesignStore((s) => s.setBrush);

  const sectionLabel = {
    fontSize: 13,
    fontWeight: 600,
    color: palette.textMuted,
    margin: '0 0 6px',
  } as const;

  return (
    <Panel title="손그림">
      <div style={{ display: 'flex', gap: 8 }}>
        <Button
          active={drawingTool === 'pen'}
          aria-pressed={drawingTool === 'pen'}
          onClick={() => setDrawingTool(drawingTool === 'pen' ? null : 'pen')}
        >
          ✏️ 펜
        </Button>
        <Button
          active={drawingTool === 'eraser'}
          aria-pressed={drawingTool === 'eraser'}
          onClick={() => setDrawingTool(drawingTool === 'eraser' ? null : 'eraser')}
        >
          🧽 지우개
        </Button>
      </div>

      <div>
        <p style={sectionLabel}>굵기 · {brush.width.toFixed(1)}cm</p>
        <input
          type="range"
          aria-label="브러시 굵기"
          min={MIN_WIDTH}
          max={MAX_WIDTH}
          step={0.5}
          value={brush.width}
          onChange={(e) => setBrush({ width: Number(e.target.value) })}
          style={{ width: '100%', accentColor: palette.primary }}
        />
      </div>

      <div>
        <p style={sectionLabel}>색상</p>
        <ColorPicker
          label="브러시 색"
          value={brush.color}
          swatches={BRUSH_SWATCHES}
          onChange={(color) => setBrush({ color })}
        />
      </div>
    </Panel>
  );
}
