import { describe, it, expect } from 'vitest';
import {
  validateDesign,
  validateElement,
  type Design,
  type Element,
} from './index';

const validDesign: Design = {
  id: 'd1',
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

  it('파이핑 width는 선택(있으면 양수)이다 — 기존 데이터 호환', () => {
    const base = {
      id: 'p1',
      type: 'piping' as const,
      transform: { x: 0, y: 0, scale: 1, rotation: 0 },
      zIndex: 0,
      variant: 'dots',
      color: '#fff',
      length: 20,
    };
    // width 없이도 통과(기존 저장 데이터).
    expect(validateElement(base)).toEqual(base);
    // width 있으면 보존.
    expect(validateElement({ ...base, width: 7 })).toMatchObject({ width: 7 });
    // 음수/0 width는 거부.
    expect(() => validateElement({ ...base, width: 0 })).toThrow();
  });
});
