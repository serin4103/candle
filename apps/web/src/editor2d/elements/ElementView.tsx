// editor2d/elements/ElementView — 요소 1개를 전개도 위에 그리는 View.
// 중심(0,0) 기준으로 그린 뒤 transform(중심점·회전·스케일)을 SVG 그룹에 적용한다.
// 계산 금지: 크기는 catalog.elementLocalSize, 좌표 변환은 그룹 transform이 담당.
import type { Element } from '@candle/shared';
import {
  illustrationAsset,
  elementLocalSize,
  ILLUSTRATION_SIZE,
  PIPING_WIDTH,
  PIPING_HEIGHT,
  LETTER_FONT_CM,
} from './catalog';

export interface ElementViewProps {
  element: Element;
}

/** 파이핑 변형을 중심(0,0) 기준 도형으로 그린다. */
function Piping({ variant, color }: { variant: string; color: string }) {
  const halfW = PIPING_WIDTH / 2;
  if (variant === 'scallop') {
    // 아래로 볼록한 스캘럽(반원) 4개.
    const n = 4;
    const w = PIPING_WIDTH / n;
    const r = w / 2;
    let d = `M ${-halfW} 0`;
    for (let i = 0; i < n; i++) {
      const x = -halfW + (i + 1) * w;
      d += ` A ${r} ${r} 0 0 0 ${x} 0`;
    }
    return <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />;
  }
  if (variant === 'star-tip') {
    // 별 5각.
    const spikes = 5;
    const outer = PIPING_HEIGHT / 2;
    const inner = outer * 0.45;
    const pts: string[] = [];
    for (let i = 0; i < spikes * 2; i++) {
      const rad = (Math.PI * i) / spikes - Math.PI / 2;
      const r = i % 2 === 0 ? outer : inner;
      pts.push(`${(Math.cos(rad) * r).toFixed(2)},${(Math.sin(rad) * r).toFixed(2)}`);
    }
    return <polygon points={pts.join(' ')} fill={color} />;
  }
  // dots — 가로 도트 줄.
  const count = 5;
  const gap = PIPING_WIDTH / (count - 1);
  return (
    <g>
      {Array.from({ length: count }, (_, i) => (
        <circle key={i} cx={-halfW + i * gap} cy={0} r={PIPING_HEIGHT / 3} fill={color} />
      ))}
    </g>
  );
}

/** 요소를 그 transform대로 배치한 SVG 그룹으로 렌더한다. */
export function ElementView({ element }: ElementViewProps) {
  const { x, y, scale, rotation } = element.transform;
  const deg = (rotation * 180) / Math.PI;
  const groupTransform = `translate(${x} ${y}) rotate(${deg}) scale(${scale})`;

  let body: JSX.Element;
  switch (element.type) {
    case 'lettering':
      body = (
        <text
          x={0}
          y={0}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily={element.font}
          fontSize={LETTER_FONT_CM}
          fill={element.color}
        >
          {element.text}
        </text>
      );
      break;
    case 'piping':
      body = <Piping variant={element.variant} color={element.color} />;
      break;
    case 'illustration': {
      const asset = illustrationAsset(element.assetId);
      const { width, height } = elementLocalSize(element);
      body = asset ? (
        <image
          href={asset.src}
          x={-width / 2}
          y={-height / 2}
          width={width}
          height={height}
          preserveAspectRatio="xMidYMid meet"
        />
      ) : (
        <rect
          x={-ILLUSTRATION_SIZE / 2}
          y={-ILLUSTRATION_SIZE / 2}
          width={ILLUSTRATION_SIZE}
          height={ILLUSTRATION_SIZE}
          fill="#ccc"
        />
      );
      break;
    }
    default:
      // image/drawing(Must 미사용) — 자리표시 박스.
      body = (
        <rect
          x={-ILLUSTRATION_SIZE / 2}
          y={-ILLUSTRATION_SIZE / 2}
          width={ILLUSTRATION_SIZE}
          height={ILLUSTRATION_SIZE}
          fill="#ccc"
        />
      );
  }

  return (
    <g transform={groupTransform} data-element-id={element.id} style={{ cursor: 'pointer' }}>
      {body}
    </g>
  );
}
