// editor2d/elements/PipingPreview — 라이브러리 타일용 파이핑 미리보기(View).
// 캔버스와 동일한 PipingRun을 작은 SVG에 담아 모티프 모양을 그대로 보여준다.
import { PipingRun } from './ElementView';
import { PIPING_HEIGHT, PIPING_UNIT } from './catalog';

export interface PipingPreviewProps {
  variant: string;
  color: string;
  width?: number;
  height?: number;
}

export function PipingPreview({ variant, color, width = 60, height = 26 }: PipingPreviewProps) {
  // 모티프 3개 분량을 보여준다. viewBox는 PipingRun의 cm 단위와 동일.
  const len = PIPING_UNIT * 3;
  const padX = 2;
  const vbW = len + padX * 2;
  const vbH = PIPING_HEIGHT * 2;
  return (
    <svg
      viewBox={`${-vbW / 2} ${-vbH / 2} ${vbW} ${vbH}`}
      width={width}
      height={height}
      style={{ display: 'block', pointerEvents: 'none' }}
      aria-hidden="true"
    >
      <PipingRun variant={variant} color={color} length={len} />
    </svg>
  );
}
