// editor2d/canvas/NetPreview — 전개도 읽기 전용 프리뷰(View).
// store를 구독하고 shared/geometry.getNet으로 모양을, baseColor/creamColor로
// 색을 반영한다. 요소 배치·핸들·히트테스트(상호작용)는 Phase 3에서 추가된다.
import { getNet } from '@candle/shared/geometry';
import { palette, fontStack } from '../../ui';
import { useDesignStore } from '../../document/store';
import { topOutlinePath, sideScallopPath, type Box } from './netPath';

const TOP_BOX: Box = { x: 70, y: 40, width: 220, height: 220 };
const SIDE_BOX: Box = { x: 30, y: 320, width: 300, height: 120 };

export function NetPreview() {
  const shape = useDesignStore((s) => s.design.shape);
  const spec = useDesignStore((s) => s.design.spec);
  const baseColor = useDesignStore((s) => s.design.baseColor);
  const creamColor = useDesignStore((s) => s.design.creamColor);

  const net = getNet(shape, spec);
  const topPath = topOutlinePath(net, TOP_BOX);
  const scallop = sideScallopPath(SIDE_BOX, 12);

  const labelStyle = {
    fontFamily: fontStack,
    fontSize: 13,
    fontWeight: 600,
    fill: palette.textMuted,
  } as const;

  return (
    <svg
      viewBox="0 0 360 470"
      role="img"
      aria-label={`전개도 프리뷰 (${shape})`}
      data-shape={shape}
      style={{ width: '100%', height: '100%', maxWidth: 520 }}
    >
      {/* 윗면 */}
      <text x={180} y={28} textAnchor="middle" style={labelStyle}>
        윗면 · TOP
      </text>
      <path
        d={topPath}
        fill={baseColor}
        stroke={creamColor}
        strokeWidth={6}
        strokeLinejoin="round"
      />

      {/* 옆면(전개) */}
      <text x={180} y={306} textAnchor="middle" style={labelStyle}>
        옆면 · SIDE (전개)
      </text>
      <rect
        x={SIDE_BOX.x}
        y={SIDE_BOX.y}
        width={SIDE_BOX.width}
        height={SIDE_BOX.height}
        rx={10}
        fill={baseColor}
      />
      {/* 상단 크림 스캘럽 */}
      <path d={scallop} fill={creamColor} stroke="none" />
    </svg>
  );
}
