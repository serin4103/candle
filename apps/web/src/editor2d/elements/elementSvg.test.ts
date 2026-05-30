import { describe, it, expect } from 'vitest';
import { pipingMarkup } from './elementSvg';
import { pipingCount } from './catalog';

describe('pipingMarkup — 파이핑 보강', () => {
  it('원형(dots)은 빈틈 없는 원 count개를 그린다(간격=지름)', () => {
    const length = 40;
    const width = 7;
    const svg = pipingMarkup('dots', '#ff00aa', length, width);
    const circles = svg.match(/<circle/g) ?? [];
    expect(circles.length).toBe(pipingCount(length, width));
    expect(svg).toContain('#ff00aa');
    // 반지름 = 간격/2 (서로 접함).
    const spacing = length / pipingCount(length, width);
    expect(svg).toContain(`r="${(spacing / 2).toFixed(2)}"`);
  });

  it('물방울(teardrop)은 count개의 path를 그린다(별모양 polygon 아님)', () => {
    const length = 30;
    const width = 7;
    const svg = pipingMarkup('teardrop', '#123456', length, width);
    const paths = svg.match(/<path/g) ?? [];
    expect(paths.length).toBe(pipingCount(length, width));
    expect(svg).not.toContain('<polygon'); // 별모양 제거
    expect(svg).toContain('#123456');
  });

  it('굵기를 키우면 개수가 줄어든다(빈틈 없는 배치)', () => {
    const thin = pipingMarkup('dots', '#000', 40, 4).match(/<circle/g)?.length ?? 0;
    const thick = pipingMarkup('dots', '#000', 40, 12).match(/<circle/g)?.length ?? 0;
    expect(thick).toBeLessThan(thin);
  });

  it('스캘럽은 stroke-width로 굵기를 반영한다', () => {
    const svg = pipingMarkup('scallop', '#abcdef', 40, 10);
    expect(svg).toContain('<path');
    expect(svg).toContain('stroke="#abcdef"');
    expect(svg).toContain('stroke-width="4"'); // width * 0.4
  });

  it('width 미지정 시 기본 굵기로 보강한다(기존 데이터 호환)', () => {
    const svg = pipingMarkup('dots', '#000', 21);
    expect(svg).toContain('<circle');
  });

  it('미상 variant는 원형으로 폴백한다(옛 star-tip 안전)', () => {
    const svg = pipingMarkup('star-tip', '#000', 21, 7);
    expect(svg).toContain('<circle');
    expect(svg).not.toContain('<polygon');
  });
});
