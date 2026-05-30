import { describe, it, expect } from 'vitest';
import { pipingMarkup } from './elementSvg';

/** 직선 수평 경로(길이 len, 원점 중심). */
function line(len: number) {
  return [
    { x: -len / 2, y: 0 },
    { x: len / 2, y: 0 },
  ];
}

describe('pipingMarkup — 곡선 경로 파이핑', () => {
  it('원형(dots)은 경로를 따라 일정 간격(=굵기)으로 원을 찍는다', () => {
    const width = 2;
    const svg = pipingMarkup('dots', '#ff00aa', line(20), width);
    const circles = svg.match(/<circle/g) ?? [];
    // 길이 20, 간격 2 → 약 11개(0,2,…,20).
    expect(circles.length).toBe(11);
    expect(svg).toContain('#ff00aa');
    // 반지름 = 굵기/2 (간격=지름이라 서로 접함 → 빈틈 없음).
    expect(svg).toContain('r="1"');
  });

  it('모티프 크기는 경로 길이와 무관하게 일정하고 개수만 는다(펄럭임 없음)', () => {
    const width = 2;
    const short = pipingMarkup('dots', '#000', line(10), width).match(/r="1"/g)?.length ?? 0;
    const long = pipingMarkup('dots', '#000', line(40), width).match(/r="1"/g)?.length ?? 0;
    // 두 경우 모두 반지름 1로 동일(크기 고정), 긴 경로가 개수만 많다.
    expect(long).toBeGreaterThan(short);
  });

  it('굵기를 키우면 개수가 줄고 크기가 커진다', () => {
    const thin = pipingMarkup('dots', '#000', line(20), 1).match(/<circle/g)?.length ?? 0;
    const thick = pipingMarkup('dots', '#000', line(20), 4).match(/<circle/g)?.length ?? 0;
    expect(thick).toBeLessThan(thin);
  });

  it('물방울(teardrop)은 경로를 따라 path를 찍는다(별모양 polygon 아님)', () => {
    const svg = pipingMarkup('teardrop', '#123456', line(20), 2);
    const paths = svg.match(/<path/g) ?? [];
    expect(paths.length).toBeGreaterThan(1);
    expect(svg).not.toContain('<polygon'); // 별모양 제거
    expect(svg).toContain('#123456');
    expect(svg).toContain('rotate('); // 접선 방향 정렬
  });

  it('스캘럽은 경로를 따라가는 연속 라인(stroke)이다', () => {
    const svg = pipingMarkup('scallop', '#abcdef', line(20), 1.5);
    expect(svg).toContain('<path');
    expect(svg).toContain('stroke="#abcdef"');
    expect(svg).toContain('stroke-width="1.50"');
  });

  it('미상 variant는 원형으로 폴백한다(옛 star-tip 안전)', () => {
    const svg = pipingMarkup('star-tip', '#000', line(20), 2);
    expect(svg).toContain('<circle');
    expect(svg).not.toContain('<polygon');
  });

  it('빈 경로는 빈 마크업', () => {
    expect(pipingMarkup('dots', '#000', [], 2)).toBe('');
  });
});
