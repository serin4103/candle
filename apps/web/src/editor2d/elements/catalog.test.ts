import { describe, it, expect } from 'vitest';
import {
  illustrations,
  pipingVariants,
  letteringFonts,
  illustrationAsset,
  illustrationDataUri,
  recoloredSvg,
  elementLocalSize,
  pipingCount,
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

describe('pipingCount — 빈틈 없는 모티프 개수', () => {
  it('개수 = round(길이/굵기), 최소 1', () => {
    expect(pipingCount(21, 7)).toBe(3);
    expect(pipingCount(20, 7)).toBe(3); // round(2.86)
    expect(pipingCount(2, 7)).toBe(1); // 최소 1
  });
  it('길이를 늘리면 개수가 증가한다(수평 확장 핸들 동작)', () => {
    expect(pipingCount(40, 7)).toBeGreaterThan(pipingCount(21, 7));
  });
  it('간격(길이/개수)이 굵기에 근접해 점이 접한다(빈틈 없음)', () => {
    const length = 40;
    const width = 7;
    const spacing = length / pipingCount(length, width);
    // 반올림이라 굵기의 ±50% 이내(점 지름≈간격 → 서로 접함).
    expect(spacing).toBeGreaterThan(width * 0.5);
    expect(spacing).toBeLessThan(width * 1.5);
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
      elementLocalSize({ ...base, type: 'piping', variant: 'dots', color: '#fff', length: 30 }),
      elementLocalSize({ ...base, type: 'lettering', text: 'Hi', font: 'serif', color: '#000' }),
    ];
    for (const s of sizes) {
      expect(s.width).toBeGreaterThan(0);
      expect(s.height).toBeGreaterThan(0);
    }
  });

  it('파이핑 폭은 런 길이(length)를 따른다', () => {
    const base = { id: 'x', zIndex: 0, transform: { x: 0, y: 0, scale: 1, rotation: 0 } };
    const piping = (length: number) =>
      elementLocalSize({ ...base, type: 'piping', variant: 'dots', color: '#fff', length });
    expect(piping(40).width).toBeCloseTo(40, 6);
    // 아주 짧아도 최소 한 모티프 폭은 유지.
    expect(piping(0.1).width).toBeGreaterThan(0.1);
  });

  it('파이핑 높이는 굵기(width)를 따른다(없으면 기본 굵기)', () => {
    const base = { id: 'x', zIndex: 0, transform: { x: 0, y: 0, scale: 1, rotation: 0 } };
    const withW = elementLocalSize({
      ...base,
      type: 'piping',
      variant: 'dots',
      color: '#fff',
      length: 40,
      width: 10,
    });
    expect(withW.height).toBe(10);
    // width 없으면 기본 굵기(양수)로 보강.
    const noW = elementLocalSize({ ...base, type: 'piping', variant: 'dots', color: '#fff', length: 40 });
    expect(noW.height).toBeGreaterThan(0);
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
