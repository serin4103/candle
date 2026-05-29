import { describe, it, expect } from 'vitest';
import { shade } from './theme';

describe('shade', () => {
  it('음수는 어둡게, 양수는 밝게 만든다', () => {
    expect(shade('#808080', -0.2)).toBe('#4d4d4d');
    expect(shade('#808080', 0.2)).toBe('#b3b3b3');
  });

  it('#rgb 단축형을 확장 처리한다', () => {
    expect(shade('#fff', 0)).toBe('#ffffff');
  });

  it('0/255 경계를 클램프한다', () => {
    expect(shade('#000000', -0.5)).toBe('#000000');
    expect(shade('#ffffff', 0.5)).toBe('#ffffff');
  });

  it('hex가 아니면 원본을 반환한다', () => {
    expect(shade('rebeccapurple', -0.1)).toBe('rebeccapurple');
  });
});
