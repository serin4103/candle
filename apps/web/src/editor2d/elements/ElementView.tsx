// editor2d/elements/ElementView — 요소 1개를 전개도 위에 그리는 View.
// 중심(0,0) 기준으로 그린 뒤 transform(중심점·회전·스케일)을 SVG 그룹에 적용한다.
// 계산 금지: 크기는 catalog.elementLocalSize, 좌표 변환은 그룹 transform이 담당.
import type { Element } from '@candle/shared';
import {
  illustrationAsset,
  illustrationDataUri,
  elementLocalSize,
  ILLUSTRATION_SIZE,
  PIPING_HEIGHT,
  PIPING_UNIT,
  LETTER_FONT_CM,
} from './catalog';

export interface ElementViewProps {
  element: Element;
}

export interface PipingRunProps {
  variant: string;
  color: string;
  /** 런 길이(cm). 이 길이에 맞춰 모티프가 반복된다. */
  length: number;
}

/**
 * 파이핑 런 — 중심(0,0) 기준으로 length만큼 가로로 펼쳐진 띠에 모티프를 반복한다.
 * 반복 횟수는 length ÷ PIPING_UNIT. ElementView와 라이브러리 미리보기가 공유한다.
 */
export function PipingRun({ variant, color, length }: PipingRunProps) {
  const half = length / 2;
  const units = Math.max(1, Math.round(length / PIPING_UNIT));

  if (variant === 'scallop') {
    // 아래로 볼록한 반원을 연달아.
    const w = length / units;
    const r = w / 2;
    let d = `M ${-half} 0`;
    for (let i = 0; i < units; i++) {
      const x = -half + (i + 1) * w;
      d += ` A ${r} ${r} 0 0 0 ${x.toFixed(2)} 0`;
    }
    return (
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={PIPING_HEIGHT * 0.22}
        strokeLinecap="round"
      />
    );
  }

  if (variant === 'star-tip') {
    // 별 5각을 일정 간격으로.
    const outer = PIPING_HEIGHT / 2;
    const inner = outer * 0.45;
    const star: string[] = [];
    for (let i = 0; i < 10; i++) {
      const rad = (Math.PI * i) / 5 - Math.PI / 2;
      const rr = i % 2 === 0 ? outer : inner;
      star.push(`${(Math.cos(rad) * rr).toFixed(2)},${(Math.sin(rad) * rr).toFixed(2)}`);
    }
    const n = units + 1;
    const step = n > 1 ? length / (n - 1) : 0;
    return (
      <g fill={color}>
        {Array.from({ length: n }, (_, i) => (
          <polygon key={i} points={star.join(' ')} transform={`translate(${(-half + i * step).toFixed(2)} 0)`} />
        ))}
      </g>
    );
  }

  // dots — 일정 간격 도트.
  const n = units + 1;
  const step = n > 1 ? length / (n - 1) : 0;
  const r = PIPING_HEIGHT * 0.3;
  return (
    <g fill={color}>
      {Array.from({ length: n }, (_, i) => (
        <circle key={i} cx={(-half + i * step).toFixed(2)} cy={0} r={r} />
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
      body = <PipingRun variant={element.variant} color={element.color} length={element.length} />;
      break;
    case 'illustration': {
      const asset = illustrationAsset(element.assetId);
      const { width, height } = elementLocalSize(element);
      body = asset ? (
        <image
          href={illustrationDataUri(asset, element.colors)}
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
