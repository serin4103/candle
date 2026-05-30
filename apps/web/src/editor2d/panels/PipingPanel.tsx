// editor2d/panels/PipingPanel — 파이핑 추가 도구 UI(View, PRD-M3 보강).
// 손그림 패널처럼 라이브러리에서 분리한 독립 패널. 모양·굵기·색상을 고른 뒤
// 시트 위에서 드래그해 배치한다. 입력은 store 액션으로 위임만 하고 계산·상태는
// store가 보유한다(패널에 편집 로직 금지).
import { useDesignStore } from '../../document/store';
import { Panel, Button, ColorPicker, palette } from '../../ui';
import { pipingVariants, PipingPreview, MIN_PIPING_WIDTH, MAX_PIPING_WIDTH } from '../elements';

/** 파이핑 색 스와치 — 크림 위에서 잘 보이는 파스텔 + 기본 흑백. */
const PIPING_SWATCHES = ['#ef9aae', '#e87f97', '#ffffff', '#5b7fa6', '#6b8e72', '#5a3b3b'] as const;

export function PipingPanel() {
  const pendingPiping = useDesignStore((s) => s.pendingPiping);
  const pipingBrush = useDesignStore((s) => s.pipingBrush);
  const setPendingPiping = useDesignStore((s) => s.setPendingPiping);
  const setPipingBrush = useDesignStore((s) => s.setPipingBrush);

  const sectionLabel = {
    fontSize: 13,
    fontWeight: 600,
    color: palette.textMuted,
    margin: '0 0 6px',
  } as const;

  return (
    <Panel title="파이핑">
      <p style={{ fontSize: 12, color: palette.textMuted, margin: '0 0 6px' }}>
        모양을 고르고 시트 위에 원하는 곡선을 그리세요.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {pipingVariants.map((v) => {
          const active = pendingPiping?.variant === v.id;
          return (
            <Button
              key={v.id}
              active={active}
              aria-pressed={active}
              aria-label={v.label}
              title={v.label}
              style={{ width: 70, height: 40, display: 'grid', placeItems: 'center', padding: 0 }}
              onClick={() =>
                setPendingPiping(
                  active
                    ? null
                    : { variant: v.id, color: pipingBrush.color, width: pipingBrush.width },
                )
              }
            >
              <PipingPreview variant={v.id} color={pipingBrush.color} pipingWidth={pipingBrush.width} />
            </Button>
          );
        })}
      </div>

      <div>
        <p style={sectionLabel}>굵기 · {pipingBrush.width.toFixed(1)}cm</p>
        <input
          type="range"
          aria-label="파이핑 굵기"
          min={MIN_PIPING_WIDTH}
          max={MAX_PIPING_WIDTH}
          step={0.1}
          value={pipingBrush.width}
          onChange={(e) => setPipingBrush({ width: Number(e.target.value) })}
          style={{ width: '100%', accentColor: palette.primary }}
        />
      </div>

      <div>
        <p style={sectionLabel}>색상</p>
        <ColorPicker
          label="파이핑 색"
          value={pipingBrush.color}
          swatches={PIPING_SWATCHES}
          onChange={(color) => setPipingBrush({ color })}
        />
      </div>
    </Panel>
  );
}
