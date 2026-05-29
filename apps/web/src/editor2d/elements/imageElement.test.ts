// 업로드 이미지 요소(PRD-S4)의 순수 렌더 경로 테스트.
// 레지스트리를 직접 시드해 DOM 없이 검증한다(빌더는 순수, getImageAsset는 동기 조회).
import { describe, it, expect } from 'vitest';
import type { Element } from '@candle/shared';
import { registerImageAsset } from './imageAssets';
import { elementInnerMarkup } from './elementSvg';
import { elementLocalSize, ILLUSTRATION_SIZE } from './catalog';

function imageEl(assetId: string): Extract<Element, { type: 'image' }> {
  return {
    id: 'e1',
    type: 'image',
    assetId,
    transform: { x: 0, y: 0, scale: 1, rotation: 0 },
    zIndex: 0,
  };
}

describe('image 요소 렌더(PRD-S4)', () => {
  it('자산 미등록이면 자리표시(placeholder)로 그린다', () => {
    const markup = elementInnerMarkup(imageEl('missing'));
    expect(markup).toContain('<rect');
    expect(markup).not.toContain('<image');
  });

  it('등록된 자산은 data URI를 <image>로 임베드한다(2D·3D 공통)', () => {
    const dataUri = 'data:image/png;base64,AAAA';
    registerImageAsset('a1', { dataUri, width: 100, height: 100 });
    const markup = elementInnerMarkup(imageEl('a1'));
    expect(markup).toContain('<image');
    expect(markup).toContain(`href="${dataUri}"`);
  });

  it('elementLocalSize가 원본 종횡비를 반영한다(가로형)', () => {
    registerImageAsset('wide', { dataUri: 'data:,', width: 200, height: 100 });
    const size = elementLocalSize(imageEl('wide'));
    expect(size.width).toBeCloseTo(ILLUSTRATION_SIZE);
    expect(size.height).toBeCloseTo(ILLUSTRATION_SIZE / 2);
  });

  it('세로형 자산은 높이를 기준으로 맞춘다', () => {
    registerImageAsset('tall', { dataUri: 'data:,', width: 100, height: 200 });
    const size = elementLocalSize(imageEl('tall'));
    expect(size.height).toBeCloseTo(ILLUSTRATION_SIZE);
    expect(size.width).toBeCloseTo(ILLUSTRATION_SIZE / 2);
  });
});
