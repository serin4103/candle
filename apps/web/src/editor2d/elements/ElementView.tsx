// editor2d/elements/ElementView — 요소 1개를 전개도 위에 그리는 View.
// 그릴 마크업은 elementSvg(순수 빌더)가 단일 출처 — 같은 빌더를 3D 텍스처 베이커도 쓴다.
// 여기선 그 마크업을 SVG 그룹에 주입하고 transform·식별자만 얹는다(계산 금지).
import type { Element } from '@candle/shared';
import { elementInnerMarkup, pipingMarkup } from './elementSvg';

export interface ElementViewProps {
  element: Element;
  /**
   * 요소 위 커서. 기본은 선택 가능 표시 'pointer'. 도구(펜/지우개/파이핑) 활성 시엔
   * 'inherit'를 넘겨 캔버스의 도구 커서가 요소 위에서도 그대로 보이게 한다.
   */
  cursor?: string;
}

export interface PipingRunProps {
  variant: string;
  color: string;
  /** 런 길이(cm). 이 길이에 맞춰 모티프가 반복된다. */
  length: number;
  /** 굵기(cm). 모티프 지름·스캘럽 두께. 생략 시 기본 굵기로 보강. */
  width?: number;
}

/**
 * 파이핑 런 — 중심(0,0) 기준으로 length만큼 가로로 펼쳐진 띠에 모티프를 반복한다.
 * 마크업은 elementSvg.pipingMarkup가 단일 출처. 라이브러리 미리보기와도 공유한다.
 */
export function PipingRun({ variant, color, length, width }: PipingRunProps) {
  return <g dangerouslySetInnerHTML={{ __html: pipingMarkup(variant, color, length, width) }} />;
}

/** 요소를 그 transform대로 배치한 SVG 그룹으로 렌더한다. */
export function ElementView({ element, cursor = 'pointer' }: ElementViewProps) {
  const { x, y, scale, rotation } = element.transform;
  const deg = (rotation * 180) / Math.PI;
  const groupTransform = `translate(${x} ${y}) rotate(${deg}) scale(${scale})`;

  return (
    <g
      transform={groupTransform}
      data-element-id={element.id}
      style={{ cursor }}
      dangerouslySetInnerHTML={{ __html: elementInnerMarkup(element) }}
    />
  );
}
