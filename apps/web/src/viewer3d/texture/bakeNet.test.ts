// viewer3d/texture/bakeNet 단위 테스트 — buildNetSvg는 순수(디자인→SVG 문자열).
// 동기화 회귀의 토대: 디자인 변경이 굽기 입력(SVG)에 반영됨을 검증한다.
import { describe, it, expect } from 'vitest';
import { getNet } from '@candle/shared/geometry';
import type { Design } from '@candle/shared';
import { buildNetSvg, netTextureSize, NET_PX_PER_CM, NET_MAX_PX } from './bakeNet';
import { registerImageAsset } from '../../editor2d/elements';

function baseDesign(overrides: Partial<Design> = {}): Design {
  return {
    id: 'd1',
    shape: 'circle',
    baseColor: '#ffffff',
    creamColor: '#fce8c8',
    spec: { size: 1, height: 7, layers: 1 },
    elements: [],
    decorations3d: [],
    ...overrides,
  };
}

describe('buildNetSvg', () => {
  it('viewBox가 전개도 bounds와 일치한다', () => {
    const design = baseDesign();
    const net = getNet(design.shape, design.spec);
    const svg = buildNetSvg(design);
    expect(svg).toContain(
      `viewBox="0 0 ${net.bounds.width.toFixed(2)} ${net.bounds.height.toFixed(2)}"`,
    );
  });

  it('크림색으로 윗면 path와 옆면 rect를 칠한다', () => {
    const svg = buildNetSvg(baseDesign({ creamColor: '#abcdef' }));
    expect(svg).toContain('<path');
    expect(svg).toContain('<rect');
    // 크림색이 두 번 이상 등장(윗면+옆면).
    expect(svg.match(/#abcdef/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('레터링 요소의 텍스트·폰트·색상이 반영되고 XML 이스케이프된다', () => {
    const svg = buildNetSvg(
      baseDesign({
        elements: [
          {
            id: 'e1',
            type: 'lettering',
            text: 'A&B<C',
            font: 'Georgia, serif',
            color: '#123456',
            transform: { x: 10, y: 20, scale: 1, rotation: 0 },
            zIndex: 0,
          },
        ],
      }),
    );
    expect(svg).toContain('A&amp;B&lt;C');
    expect(svg).toContain('Georgia, serif');
    expect(svg).toContain('#123456');
  });

  it('파이핑 요소를 마크업으로 그린다', () => {
    const svg = buildNetSvg(
      baseDesign({
        elements: [
          {
            id: 'p1',
            type: 'piping',
            variant: 'dots',
            color: '#ff00aa',
            width: 1,
            points: [
              { x: -10, y: 0 },
              { x: 10, y: 0 },
            ],
            transform: { x: 5, y: 5, scale: 1, rotation: 0 },
            zIndex: 0,
          },
        ],
      }),
    );
    expect(svg).toContain('#ff00aa');
    expect(svg).toContain('<circle');
  });

  it('손그림(drawing) 요소를 polyline으로 굽는다(3D 반영, PRD-S1)', () => {
    const svg = buildNetSvg(
      baseDesign({
        elements: [
          {
            id: 'dr1',
            type: 'drawing',
            points: [
              { x: 4, y: 4 },
              { x: 8, y: 6 },
              { x: 12, y: 4 },
            ],
            color: '#22cc88',
            width: 3,
            transform: { x: 0, y: 0, scale: 1, rotation: 0 },
            zIndex: 0,
          },
        ],
      }),
    );
    expect(svg).toContain('<polyline');
    expect(svg).toContain('#22cc88');
    expect(svg).toContain('4,4');
    expect(svg).toContain('stroke-width="3"');
  });

  it('점 1개짜리 손그림은 원으로 굽는다', () => {
    const svg = buildNetSvg(
      baseDesign({
        elements: [
          {
            id: 'dot',
            type: 'drawing',
            points: [{ x: 5, y: 5 }],
            color: '#ff0000',
            width: 4,
            transform: { x: 0, y: 0, scale: 1, rotation: 0 },
            zIndex: 0,
          },
        ],
      }),
    );
    expect(svg).toContain('<circle');
    expect(svg).toContain('#ff0000');
  });

  it('요소를 zIndex 오름차순으로 그린다(낮은 것이 먼저)', () => {
    const svg = buildNetSvg(
      baseDesign({
        elements: [
          {
            id: 'top',
            type: 'lettering',
            text: 'TOP',
            font: 'serif',
            color: '#000',
            transform: { x: 0, y: 0, scale: 1, rotation: 0 },
            zIndex: 5,
          },
          {
            id: 'bottom',
            type: 'lettering',
            text: 'BOTTOM',
            font: 'serif',
            color: '#000',
            transform: { x: 0, y: 0, scale: 1, rotation: 0 },
            zIndex: 1,
          },
        ],
      }),
    );
    expect(svg.indexOf('BOTTOM')).toBeLessThan(svg.indexOf('TOP'));
  });

  it('순수: 같은 입력 → 같은 출력', () => {
    const a = buildNetSvg(baseDesign());
    const b = buildNetSvg(baseDesign());
    expect(a).toBe(b);
  });

  // PRD-S4: 업로드 이미지가 3D 굽기 입력(SVG)에 data URI로 포함되는지(동기화 회귀).
  it('등록된 이미지 요소를 data URI <image>로 굽기 입력에 포함한다', () => {
    const dataUri = 'data:image/png;base64,BAKEME';
    registerImageAsset('bake-1', { dataUri, width: 100, height: 100 });
    const svg = buildNetSvg(
      baseDesign({
        elements: [
          {
            id: 'img1',
            type: 'image',
            assetId: 'bake-1',
            transform: { x: 12, y: 8, scale: 1, rotation: 0 },
            zIndex: 0,
          },
        ],
      }),
    );
    expect(svg).toContain('<image');
    expect(svg).toContain(dataUri);
  });
});

describe('netTextureSize', () => {
  it('해상도(px/cm)를 적용하고 최대 px를 넘지 않는다', () => {
    const small = netTextureSize(getNet('circle', { size: 1, height: 7, layers: 1 }));
    expect(small.width).toBe(Math.round(getNet('circle', { size: 1, height: 7, layers: 1 }).bounds.width * NET_PX_PER_CM));
    // 아주 큰 케이크라도 한 변이 상한을 넘지 않는다.
    const big = netTextureSize(getNet('square', { size: 30, height: 30, layers: 5 }));
    expect(Math.max(big.width, big.height)).toBeLessThanOrEqual(NET_MAX_PX);
  });
});
