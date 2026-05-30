// editor2d/elements/PipingPreview — 라이브러리 타일용 파이핑 미리보기(View).
// 캔버스와 동일한 PipingRun을 작은 SVG에 담아 모티프 모양을 그대로 보여준다.
import { PipingRun } from './ElementView';
import { DEFAULT_PIPING_WIDTH } from './catalog';

export interface PipingPreviewProps {
  variant: string;
  color: string;
  /** 미리보기 굵기(cm). 모티프 크기. 생략 시 기본 굵기. */
  pipingWidth?: number;
  /** SVG 표시 크기(px). */
  width?: number;
  height?: number;
}

export function PipingPreview({
  variant,
  color,
  pipingWidth = DEFAULT_PIPING_WIDTH,
  width = 60,
  height = 26,
}: PipingPreviewProps) {
  // 모티프 5개 분량의 직선 샘플 경로를 보여준다. viewBox는 PipingRun의 cm 단위와 동일.
  const len = pipingWidth * 5;
  const points = [
    { x: -len / 2, y: 0 },
    { x: len / 2, y: 0 },
  ];
  const padX = pipingWidth;
  const vbW = len + padX * 2;
  const vbH = pipingWidth * 2.4;
  return (
    <svg
      viewBox={`${-vbW / 2} ${-vbH / 2} ${vbW} ${vbH}`}
      width={width}
      height={height}
      style={{ display: 'block', pointerEvents: 'none' }}
      aria-hidden="true"
    >
      <PipingRun variant={variant} color={color} points={points} width={pipingWidth} />
    </svg>
  );
}
