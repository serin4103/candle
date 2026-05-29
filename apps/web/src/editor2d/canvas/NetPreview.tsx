// editor2d/canvas/NetPreview — 전개도 읽기 전용 프리뷰(View).
// store를 구독하고 shared/geometry.getNet으로 모양·치수를 얻어 그린다.
// 윗면과 옆면을 같은 cm 스케일(viewBox 단위=cm)로 렌더하므로, 옆면 길이는
// 윗면 둘레(net.side.width)에 비례해 모양에 따라 달라진다.
// 색은 크림색(표면색) 하나로 칠한다. 요소 배치·핸들은 Phase 3에서 추가된다.
import { getNet } from '@candle/shared/geometry';
import { palette, fontStack, shade } from '../../ui';
import { useDesignStore } from '../../document/store';
import { topOutlinePath, sideScallopPath } from './netPath';

// 레이아웃 상수(cm 단위, viewBox에서 그대로 쓰인다).
const PAD = 4;
const LABEL_H = 5;
const GAP = 6;

export function NetPreview() {
  const shape = useDesignStore((s) => s.design.shape);
  const spec = useDesignStore((s) => s.design.spec);
  const creamColor = useDesignStore((s) => s.design.creamColor);

  const net = getNet(shape, spec);
  const points = net.crossSection.points;
  const topW = net.top.width;
  const topH = net.top.height;
  const sideW = net.side.width; // 둘레
  const sideH = net.side.height; // 전체 높이

  // 윗면·옆면을 같은 스케일로 가로 중앙 정렬.
  const contentW = Math.max(topW, sideW);
  const topX = PAD + (contentW - topW) / 2;
  const topY = PAD + LABEL_H;
  const sideX = PAD + (contentW - sideW) / 2;
  const sideY = topY + topH + GAP + LABEL_H;

  const viewW = contentW + PAD * 2;
  const viewH = sideY + sideH + PAD;

  const topPath = topOutlinePath(points, topX, topY);
  const scallopCount = Math.max(6, Math.round(sideW / 4));
  const scallop = sideScallopPath(sideX, sideY, sideW, scallopCount);

  const trim = shade(creamColor, -0.12);

  const labelStyle = {
    fontFamily: fontStack,
    fontSize: 3,
    fontWeight: 600,
    fill: palette.textMuted,
  } as const;

  return (
    <svg
      viewBox={`0 0 ${viewW.toFixed(2)} ${viewH.toFixed(2)}`}
      role="img"
      aria-label={`전개도 프리뷰 (${shape})`}
      data-shape={shape}
      data-side-width={sideW.toFixed(2)}
      style={{ width: '100%', height: '100%', maxHeight: 560 }}
    >
      {/* 윗면 */}
      <text x={topX + topW / 2} y={topY - 1.5} textAnchor="middle" style={labelStyle}>
        윗면 · TOP
      </text>
      <path
        d={topPath}
        fill={creamColor}
        stroke={trim}
        strokeWidth={0.5}
        strokeLinejoin="round"
      />

      {/* 옆면(전개) — 폭이 둘레에 비례 */}
      <text x={sideX + sideW / 2} y={sideY - 4} textAnchor="middle" style={labelStyle}>
        옆면 · SIDE (전개)
      </text>
      <rect
        x={sideX}
        y={sideY}
        width={sideW}
        height={sideH}
        rx={1}
        fill={creamColor}
      />
      {/* 상단 크림 스캘럽 */}
      <path d={scallop} fill={trim} stroke="none" />
    </svg>
  );
}
