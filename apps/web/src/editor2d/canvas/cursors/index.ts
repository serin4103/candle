// editor2d/canvas/cursors — 도구별 커스텀 커서(View 표현 자산).
// PNG 이미지를 CSS cursor로 쓴다(PNG는 SVG보다 브라우저 호환성이 넓다 — Safari 포함).
// 핫스팟(작용점 = 도구 끝)은 리사이즈된 이미지(가장 긴 변 64px) 픽셀 기준이며,
// 모두 좌하단 끝을 가리킨다. 폴백 키워드를 함께 둔다.
import pencilUrl from './pencil.png?url';
import eraserUrl from './eraser.png?url';
import pipingUrl from './piping.png?url';

/** 펜(연필) — 좌하단 니브 끝이 작용점. */
export const PEN_CURSOR = `url(${pencilUrl}) 4 60, crosshair`;
/** 지우개 — 좌하단이 작용점. */
export const ERASER_CURSOR = `url(${eraserUrl}) 10 56, cell`;
/** 파이핑(짤주머니) — 좌하단 깍지 끝이 작용점. */
export const PIPING_CURSOR = `url(${pipingUrl}) 6 60, crosshair`;
