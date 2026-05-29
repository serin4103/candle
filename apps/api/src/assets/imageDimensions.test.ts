// imageDimensions 단위 테스트(PRD-S4) — Asset.width/height 파싱 검증.
import { describe, it, expect } from 'vitest';
import { imageDimensions, imageKindForMime } from './imageDimensions';

/** 최소 PNG: 8B 시그니처 + IHDR(폭@16, 높이@20, big-endian 32bit). */
function makePng(width: number, height: number): Uint8Array {
  const b = new Uint8Array(24);
  b.set([137, 80, 78, 71, 13, 10, 26, 10], 0); // 시그니처
  const view = new DataView(b.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return b;
}

/**
 * 최소 JPEG: SOI(FFD8) + SOF0(FFC0) 프레임 헤더.
 * 레이아웃: FF C0 | len(2) | precision(1) | height(2) | width(2).
 */
function makeJpeg(width: number, height: number): Uint8Array {
  const b = new Uint8Array(12);
  b.set([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08], 0); // 0..6
  const view = new DataView(b.buffer);
  view.setUint16(7, height); // 바이트 7·8
  view.setUint16(9, width); // 바이트 9·10
  return b;
}

const enc = (s: string) => new TextEncoder().encode(s);

describe('imageKindForMime', () => {
  it('PNG·JPG·SVG를 허용하고 그 외는 undefined', () => {
    expect(imageKindForMime('image/png')).toBe('png');
    expect(imageKindForMime('image/jpeg')).toBe('jpeg');
    expect(imageKindForMime('image/svg+xml')).toBe('svg');
    expect(imageKindForMime('image/gif')).toBeUndefined();
    expect(imageKindForMime('application/pdf')).toBeUndefined();
  });
});

describe('imageDimensions', () => {
  it('PNG IHDR에서 치수를 읽는다', () => {
    expect(imageDimensions(makePng(640, 480), 'image/png')).toEqual({ width: 640, height: 480 });
  });

  it('JPEG SOF0에서 치수를 읽는다', () => {
    expect(imageDimensions(makeJpeg(1024, 768), 'image/jpeg')).toEqual({
      width: 1024,
      height: 768,
    });
  });

  it('SVG width/height 속성에서 치수를 읽는다', () => {
    expect(imageDimensions(enc('<svg width="120" height="80"></svg>'), 'image/svg+xml')).toEqual({
      width: 120,
      height: 80,
    });
  });

  it('SVG에 width/height가 없으면 viewBox에서 치수를 읽는다', () => {
    expect(
      imageDimensions(enc('<svg viewBox="0 0 200 100"></svg>'), 'image/svg+xml'),
    ).toEqual({ width: 200, height: 100 });
  });

  it('비허용 타입은 {0,0}', () => {
    expect(imageDimensions(enc('x'), 'image/gif')).toEqual({ width: 0, height: 0 });
  });
});
