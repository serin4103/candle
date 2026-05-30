import { describe, it, expect } from 'vitest';
import {
  validateDesign,
  validateElement,
  type Design,
  type Element,
} from './index';

const validDesign: Design = {
  id: 'd1',
  title: '내 케이크 디자인',
  shape: 'circle',
  baseColor: '#fff',
  creamColor: '#eee',
  spec: { size: 1, height: 7, layers: 1 },
  elements: [],
  decorations3d: [],
};

describe('validateDesign', () => {
  it('정상 디자인을 통과시킨다', () => {
    expect(validateDesign(validDesign)).toEqual(validDesign);
  });

  it('잘못된 shape는 거부한다', () => {
    expect(() => validateDesign({ ...validDesign, shape: 'star' })).toThrow();
  });

  it('규격 음수·소수 단수는 거부한다', () => {
    expect(() =>
      validateDesign({ ...validDesign, spec: { size: 0, height: 7, layers: 1 } }),
    ).toThrow();
    expect(() =>
      validateDesign({ ...validDesign, spec: { size: 1, height: 7, layers: 1.5 } }),
    ).toThrow();
  });

  it('thumbnailAssetId는 선택 — 없어도 통과하고 있으면 보존한다(PRD-S6 썸네일)', () => {
    expect(validateDesign(validDesign).thumbnailAssetId).toBeUndefined();
    const withThumb = { ...validDesign, thumbnailAssetId: 'asset-123' };
    expect(validateDesign(withThumb).thumbnailAssetId).toBe('asset-123');
  });
});

describe('validateElement', () => {
  it('레터링 요소를 통과시킨다', () => {
    const lettering: Element = {
      id: 'e1',
      type: 'lettering',
      transform: { x: 1, y: 2, scale: 1, rotation: 0 },
      zIndex: 0,
      text: 'Happy',
      font: 'serif',
      color: '#000',
    };
    expect(validateElement(lettering)).toEqual(lettering);
  });

  it('판별 유니온: 타입에 맞지 않는 payload는 거부', () => {
    // lettering인데 text 누락
    expect(() =>
      validateElement({
        id: 'e2',
        type: 'lettering',
        transform: { x: 0, y: 0, scale: 1, rotation: 0 },
        zIndex: 0,
        font: 'serif',
        color: '#000',
      }),
    ).toThrow();
  });

  it('scale은 양수여야 한다', () => {
    expect(() =>
      validateElement({
        id: 'e3',
        type: 'illustration',
        transform: { x: 0, y: 0, scale: 0, rotation: 0 },
        zIndex: 0,
        assetId: 'a1',
      }),
    ).toThrow();
  });

  it('파이핑은 경로(points)를 갖고 width는 선택(있으면 양수)이다', () => {
    const base = {
      id: 'p1',
      type: 'piping' as const,
      transform: { x: 0, y: 0, scale: 1, rotation: 0 },
      zIndex: 0,
      variant: 'dots',
      color: '#fff',
      points: [
        { x: -10, y: 0 },
        { x: 10, y: 0 },
      ],
    };
    // width 없이도 통과(렌더에서 기본 굵기로 보강).
    expect(validateElement(base)).toEqual(base);
    // width 있으면 보존.
    expect(validateElement({ ...base, width: 1 })).toMatchObject({ width: 1 });
    // 음수/0 width는 거부.
    expect(() => validateElement({ ...base, width: 0 })).toThrow();
    // 빈 경로는 거부(min 1).
    expect(() => validateElement({ ...base, points: [] })).toThrow();
  });
});
