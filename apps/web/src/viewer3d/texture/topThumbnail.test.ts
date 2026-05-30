// viewer3d/texture/topThumbnail 단위 테스트 — buildTopThumbnailSvg는 순수(디자인→SVG 문자열).
// 윗면(net.top) viewBox로만 잘라 굽는지(좌표 단일화)와 윗면 디자인이 반영되는지 검증한다.
// 래스터화(buildTopThumbnail)는 브라우저 canvas/Image 의존이라 여기선 SVG까지만 검증한다.
import { describe, it, expect } from 'vitest';
import { getNet } from '@candle/shared/geometry';
import type { Design } from '@candle/shared';
import { buildTopThumbnailSvg } from './topThumbnail';

function baseDesign(overrides: Partial<Design> = {}): Design {
  return {
    id: 'd1',
    title: '내 케이크 디자인',
    shape: 'circle',
    baseColor: '#ffffff',
    creamColor: '#fce8c8',
    spec: { size: 1, height: 7, layers: 1 },
    elements: [],
    decorations3d: [],
    ...overrides,
  };
}

describe('buildTopThumbnailSvg', () => {
  it('viewBox를 전개도 윗면(net.top) rect로 잡는다(좌표 단일화 — geometry 경유)', () => {
    const design = baseDesign();
    const { x, y, width, height } = getNet(design.shape, design.spec).top;
    const svg = buildTopThumbnailSvg(design);
    expect(svg).toContain(
      `viewBox="${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)}"`,
    );
  });

  it('윗면을 전체 전개도(bounds)로 굽지 않는다(옆면 제외)', () => {
    const design = baseDesign();
    const net = getNet(design.shape, design.spec);
    const svg = buildTopThumbnailSvg(design);
    // 전체 굽기(buildNetSvg)는 "0 0 bounds.w bounds.h"를 쓴다 — 썸네일은 그게 아니어야 한다.
    expect(svg).not.toContain(
      `viewBox="0 0 ${net.bounds.width.toFixed(2)} ${net.bounds.height.toFixed(2)}"`,
    );
  });

  it('크림색 윗면과 윗면 위 요소를 포함한다', () => {
    const svg = buildTopThumbnailSvg(
      baseDesign({
        creamColor: '#abcdef',
        elements: [
          {
            id: 'e1',
            type: 'lettering',
            text: 'HELLO',
            font: 'serif',
            color: '#123456',
            transform: { x: 10, y: 5, scale: 1, rotation: 0 },
            zIndex: 0,
          },
        ],
      }),
    );
    expect(svg).toContain('<path'); // 윗면 외곽선(크림 채움)
    expect(svg).toContain('#abcdef');
    expect(svg).toContain('HELLO');
    expect(svg).toContain('#123456');
  });

  it('순수: 같은 입력 → 같은 출력', () => {
    expect(buildTopThumbnailSvg(baseDesign())).toBe(buildTopThumbnailSvg(baseDesign()));
  });
});
