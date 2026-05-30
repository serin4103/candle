// 기본 디자인 문서 팩토리. 새 시안의 시작 상태를 만든다.
// schema 타입만 사용하고 좌표 계산은 하지 않는다(Model 토대).
import { DEFAULT_DESIGN_TITLE, type Design, type Spec } from '@candle/shared';

/** 기본 규격: 1호·한 단·높이 7cm. */
export const DEFAULT_SPEC: Spec = { size: 1, height: 7, layers: 1 };

/** 기본 시트색(빵, 표면엔 가려짐)·크림색(표면색). */
export const DEFAULT_BASE_COLOR = '#f7e7d3';
export const DEFAULT_CREAM_COLOR = '#fce8c8';

/** 새 빈 디자인 문서를 만든다. id는 런타임에서 생성. */
export function createDefaultDesign(): Design {
  return {
    id: crypto.randomUUID(),
    title: DEFAULT_DESIGN_TITLE,
    shape: 'circle',
    baseColor: DEFAULT_BASE_COLOR,
    creamColor: DEFAULT_CREAM_COLOR,
    spec: { ...DEFAULT_SPEC },
    elements: [],
    decorations3d: [],
  };
}
