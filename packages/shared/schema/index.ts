// packages/shared/schema — 디자인 문서 타입과 검증 규칙의 단일 출처.
// 프론트(web)·백엔드(api)가 동일한 디자인 문서 형식을 공유한다.
// 규칙: 타입 + 검증(zod)만. 비즈니스 로직·좌표 계산은 geometry/ViewModel으로.
import { z } from 'zod';

/** 시트 모양 (PRD-M1). */
export const Shape = z.enum(['circle', 'square', 'heart']);
export type Shape = z.infer<typeof Shape>;

/**
 * 요소 변환. **x·y는 전개도(UV) 좌표계 기준** (CLAUDE.md 좌표 단일화 원칙).
 * rotation 단위는 라디안 — 화면 표시용 각도는 View에서 변환한다.
 */
export const Transform = z.object({
  x: z.number(),
  y: z.number(),
  scale: z.number().positive(),
  rotation: z.number(),
});
export type Transform = z.infer<typeof Transform>;

/** 케이크 규격 (PRD-S5 대비, Must에선 기본값 고정 가능). */
export const Spec = z.object({
  size: z.number().int().positive(), // 호수
  height: z.number().positive(), // 한 단 높이(cm)
  layers: z.number().int().positive(), // 단 수
});
export type Spec = z.infer<typeof Spec>;

/** 요소 공통 필드. 모든 Element 변형이 공유한다. */
const elementBase = {
  id: z.string(),
  transform: Transform,
  zIndex: z.number().int(),
};

/** 일러스트 — 라이브러리 자산 참조 (PRD-M3). */
export const IllustrationElement = z.object({
  ...elementBase,
  type: z.literal('illustration'),
  assetId: z.string(),
  /**
   * 색상 교체(선택). 자산 원본 팔레트와 같은 순서로, colors[i]가 있으면
   * 원본 i번째 색을 그 색으로 바꿔 렌더한다. 없으면 원본색 유지.
   */
  colors: z.array(z.string()).optional(),
});

/** 레터링 — 텍스트·폰트·색상 변경 대상 (PRD-M3). */
export const LetteringElement = z.object({
  ...elementBase,
  type: z.literal('lettering'),
  text: z.string(),
  font: z.string(),
  color: z.string(),
});

/**
 * 파이핑(크림 장식) (PRD-M3). 시트 위를 드래그한 길이만큼 모티프가 반복되는
 * "선" 요소다. length는 전개도(cm) 기준 런 길이(로컬 x축 방향), transform.x·y는
 * 런의 중심, rotation은 드래그 방향.
 */
export const PipingElement = z.object({
  ...elementBase,
  type: z.literal('piping'),
  variant: z.string(),
  color: z.string(),
  length: z.number().positive(),
});

/** 손그림 (PRD-S1 대비 선언 — Must 미사용). */
export const DrawingElement = z.object({
  ...elementBase,
  type: z.literal('drawing'),
  points: z.array(z.object({ x: z.number(), y: z.number() })),
  color: z.string(),
  width: z.number().positive(),
});

/** 업로드 이미지 (PRD-S4 대비 선언 — Must 미사용). */
export const ImageElement = z.object({
  ...elementBase,
  type: z.literal('image'),
  assetId: z.string(),
});

/** 전개도 위 2D 요소. type으로 판별하는 유니온. */
export const Element = z.discriminatedUnion('type', [
  IllustrationElement,
  LetteringElement,
  PipingElement,
  DrawingElement,
  ImageElement,
]);
export type Element = z.infer<typeof Element>;
export type ElementType = Element['type'];

/** 3D 좌표 (Decoration3D 용). */
export const Vec3 = z.object({ x: z.number(), y: z.number(), z: z.number() });
export type Vec3 = z.infer<typeof Vec3>;

/** 입체 데코 (PRD-S3 대비 선언 — Must 미사용). */
export const Decoration3D = z.object({
  id: z.string(),
  type: z.enum(['candle', 'topper', 'fruit']),
  position: Vec3,
  rotation: Vec3,
});
export type Decoration3D = z.infer<typeof Decoration3D>;

/** 디자인 문서 — 전개도와 3D가 함께 렌더링하는 단일 출처. */
export const Design = z.object({
  id: z.string(),
  shape: Shape,
  baseColor: z.string(), // 시트색
  creamColor: z.string(),
  spec: Spec,
  elements: z.array(Element),
  decorations3d: z.array(Decoration3D),
});
export type Design = z.infer<typeof Design>;

/**
 * 공유 링크 — 비로그인 열람용 토큰 (PRD-M5).
 * PRD-S6 로그인 도입으로 편집 링크(editToken)는 제거됐다. 편집 권한은
 * 토큰이 아니라 소유권(`ownerId`, DB 메타)으로 제어한다.
 */
export const ShareLink = z.object({
  designId: z.string(),
  viewToken: z.string(),
});
export type ShareLink = z.infer<typeof ShareLink>;

/** 업로드 이미지 메타 (PRD-S4 대비 선언 — Must 미사용). */
export const Asset = z.object({
  id: z.string(),
  url: z.string(),
  mime: z.string(),
  width: z.number().int().nonnegative(),
  height: z.number().int().nonnegative(),
  sizeBytes: z.number().int().nonnegative(),
});
export type Asset = z.infer<typeof Asset>;

/** 디자인 문서 검증 — 저장·로드 경계에서 형식을 보장한다. */
export function validateDesign(input: unknown): Design {
  return Design.parse(input);
}

/** 단일 요소 검증. */
export function validateElement(input: unknown): Element {
  return Element.parse(input);
}
