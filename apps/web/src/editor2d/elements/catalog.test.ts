import { describe, it, expect } from 'vitest';
import {
  illustrations,
  pipingVariants,
  letteringFonts,
  illustrationAsset,
  elementLocalSize,
} from './catalog';

describe('카탈로그 — 3개 카테고리 제공', () => {
  it('일러스트/파이핑/폰트 목록이 비어있지 않다', () => {
    expect(illustrations.length).toBeGreaterThan(0);
    expect(pipingVariants.length).toBeGreaterThan(0);
    expect(letteringFonts.length).toBeGreaterThan(0);
  });
});

describe('illustrationAsset', () => {
  it('알려진 id는 SVG 자산(src·aspect), 미상은 undefined', () => {
    const cat = illustrationAsset('cat-face');
    expect(cat).toBeDefined();
    expect(cat!.src).toBeTruthy();
    expect(cat!.aspect).toBeGreaterThan(0);
    expect(illustrationAsset('???')).toBeUndefined();
  });

  it('모든 일러스트가 SVG 자산을 가리킨다', () => {
    for (const a of illustrations) {
      expect(a.src).toMatch(/\.svg/);
      expect(a.aspect).toBeGreaterThan(0);
    }
  });
});

describe('elementLocalSize', () => {
  it('모든 타입이 양수 크기를 가진다', () => {
    const base = { id: 'x', zIndex: 0, transform: { x: 0, y: 0, scale: 1, rotation: 0 } };
    const sizes = [
      elementLocalSize({ ...base, type: 'illustration', assetId: 'a' }),
      elementLocalSize({ ...base, type: 'piping', variant: 'dots', color: '#fff' }),
      elementLocalSize({ ...base, type: 'lettering', text: 'Hi', font: 'serif', color: '#000' }),
    ];
    for (const s of sizes) {
      expect(s.width).toBeGreaterThan(0);
      expect(s.height).toBeGreaterThan(0);
    }
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
