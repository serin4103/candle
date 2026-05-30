import { describe, it, expect } from 'vitest';
import {
  illustrations,
  pipingVariants,
  letteringFonts,
  illustrationAsset,
  illustrationDataUri,
  recoloredSvg,
  elementLocalSize,
} from './catalog';

describe('카탈로그 — 3개 카테고리 제공', () => {
  it('일러스트/파이핑/폰트 목록이 비어있지 않다', () => {
    expect(illustrations.length).toBeGreaterThan(0);
    expect(pipingVariants.length).toBeGreaterThan(0);
    expect(letteringFonts.length).toBeGreaterThan(0);
  });
});

describe('파이핑 변형 (보강: 별모양 제거·물방울 추가)', () => {
  it('물방울(teardrop)이 있고 별모양(star-tip)은 없다', () => {
    const ids = pipingVariants.map((v) => v.id);
    expect(ids).toContain('teardrop');
    expect(ids).toContain('dots');
    expect(ids).not.toContain('star-tip');
  });
});

describe('illustrationAsset', () => {
  it('알려진 id는 SVG 자산(raw·aspect·palette), 미상은 undefined', () => {
    const cat = illustrationAsset('cat-face');
    expect(cat).toBeDefined();
    expect(cat!.raw).toContain('<svg');
    expect(cat!.aspect).toBeGreaterThan(0);
    expect(cat!.palette.length).toBeGreaterThan(0);
    expect(illustrationAsset('???')).toBeUndefined();
  });

  it('모든 일러스트가 SVG 원본·팔레트를 가진다', () => {
    for (const a of illustrations) {
      expect(a.raw).toContain('<svg');
      expect(a.aspect).toBeGreaterThan(0);
      expect(a.palette.length).toBeGreaterThan(0);
    }
  });
});

describe('일러스트 색상 교체', () => {
  it('palette 색을 colors로 치환한다(없으면 원본)', () => {
    const cat = illustrationAsset('cat-face')!;
    const orig = cat.palette[0]!;
    const replaced = recoloredSvg(cat, ['#ff0000']);
    expect(replaced).toContain('#ff0000');
    expect(replaced.toLowerCase()).not.toContain(orig.toLowerCase());
    // colors 없으면 원본 유지.
    expect(recoloredSvg(cat, undefined)).toBe(cat.raw);
  });

  it('데이터 URI를 만든다', () => {
    const cat = illustrationAsset('cat-face')!;
    expect(illustrationDataUri(cat)).toMatch(/^data:image\/svg\+xml,/);
  });

  it('두 색을 각각 독립적으로 교체한다(한쪽만도 가능)', () => {
    const twoColor = {
      id: 'two',
      label: '두색',
      aspect: 1,
      raw: '<svg><path fill="#aaaaaa"/><path stroke="#bbbbbb"/></svg>',
      palette: ['#aaaaaa', '#bbbbbb'],
    };
    const both = recoloredSvg(twoColor, ['#111111', '#222222']);
    expect(both).toContain('#111111');
    expect(both).toContain('#222222');
    expect(both).not.toContain('#aaaaaa');
    expect(both).not.toContain('#bbbbbb');

    const onlyFirst = recoloredSvg(twoColor, ['#111111']);
    expect(onlyFirst).toContain('#111111');
    expect(onlyFirst).toContain('#bbbbbb'); // 두 번째는 원본 유지
  });
});

describe('elementLocalSize', () => {
  it('모든 타입이 양수 크기를 가진다', () => {
    const base = { id: 'x', zIndex: 0, transform: { x: 0, y: 0, scale: 1, rotation: 0 } };
    const sizes = [
      elementLocalSize({ ...base, type: 'illustration', assetId: 'a' }),
      elementLocalSize({
        ...base,
        type: 'piping',
        variant: 'dots',
        color: '#fff',
        points: [
          { x: -15, y: 0 },
          { x: 15, y: 0 },
        ],
      }),
      elementLocalSize({ ...base, type: 'lettering', text: 'Hi', font: 'serif', color: '#000' }),
    ];
    for (const s of sizes) {
      expect(s.width).toBeGreaterThan(0);
      expect(s.height).toBeGreaterThan(0);
    }
  });

  it('파이핑 크기는 경로 경계상자 + 굵기 여유를 따른다', () => {
    const base = { id: 'x', zIndex: 0, transform: { x: 0, y: 0, scale: 1, rotation: 0 } };
    const size = elementLocalSize({
      ...base,
      type: 'piping',
      variant: 'dots',
      color: '#fff',
      width: 2,
      points: [
        { x: -10, y: -3 },
        { x: 10, y: 3 },
      ],
    });
    // 폭 = bbox폭(20) + 굵기(2), 높이 = bbox높이(6) + 굵기(2).
    expect(size.width).toBeCloseTo(22, 6);
    expect(size.height).toBeCloseTo(8, 6);
  });

  it('파이핑 굵기 미지정 시 기본 굵기로 여유를 둔다(양수 크기)', () => {
    const base = { id: 'x', zIndex: 0, transform: { x: 0, y: 0, scale: 1, rotation: 0 } };
    const size = elementLocalSize({
      ...base,
      type: 'piping',
      variant: 'dots',
      color: '#fff',
      points: [{ x: 0, y: 0 }],
    });
    expect(size.width).toBeGreaterThan(0);
    expect(size.height).toBeGreaterThan(0);
  });

  it('레터링 폭은 글자 수에 비례해 커진다', () => {
    const base = { id: 'x', zIndex: 0, transform: { x: 0, y: 0, scale: 1, rotation: 0 } };
    const short = elementLocalSize({ ...base, type: 'lettering', text: 'A', font: 'serif', color: '#000' });
    const long = elementLocalSize({
      ...base,
      type: 'lettering',
      text: 'Happy Birthday',
      font: 'serif',
      color: '#000',
    });
    expect(long.width).toBeGreaterThan(short.width);
  });
});
