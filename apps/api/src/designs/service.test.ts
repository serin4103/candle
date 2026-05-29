// designs 서비스 단위 테스트 — PRD-M5 완료 기준을 직접 증명한다.
import { describe, it, expect, beforeEach } from 'vitest';
import { createInMemoryRepository } from '../infra';
import { createDesignService, DesignNotFoundError, type DesignService } from './service';

/** 검증을 통과하는 최소 디자인 입력(서버가 id를 부여하므로 id 생략). */
function makeDesignInput(creamColor = '#fff') {
  return {
    shape: 'circle' as const,
    baseColor: '#f5d',
    creamColor,
    spec: { size: 1, height: 7, layers: 1 },
    elements: [],
    decorations3d: [],
  };
}

describe('DesignService (PRD-M5)', () => {
  let service: DesignService;

  beforeEach(() => {
    service = createDesignService(createInMemoryRepository());
  });

  it('저장하면 디자인과 편집/열람 토큰을 발급한다 (서버 저장)', () => {
    const { design, shareLink } = service.create(makeDesignInput());
    expect(design.id).toBeTruthy();
    expect(shareLink.designId).toBe(design.id);
    expect(shareLink.editToken).toBeTruthy();
    expect(shareLink.viewToken).toBeTruthy();
  });

  it('편집/열람 토큰은 서로 다른 고유 값이다 (서로 다른 URL)', () => {
    const a = service.create(makeDesignInput());
    const b = service.create(makeDesignInput());
    const tokens = [
      a.shareLink.editToken,
      a.shareLink.viewToken,
      b.shareLink.editToken,
      b.shareLink.viewToken,
    ];
    expect(new Set(tokens).size).toBe(4);
  });

  it('편집/열람 토큰으로 같은 문서를 로드한다', () => {
    const { design, shareLink } = service.create(makeDesignInput());
    const edit = service.getByEdit(shareLink.editToken);
    expect(edit.design.id).toBe(design.id);
    // 작성자 로드는 두 링크를 함께 돌려준다.
    expect(edit.shareLink.editToken).toBe(shareLink.editToken);
    expect(edit.shareLink.viewToken).toBe(shareLink.viewToken);
    expect(service.getByView(shareLink.viewToken).id).toBe(design.id);
  });

  it('편집 토큰으로 작성자가 수정할 수 있다 (id 유지)', () => {
    const { design, shareLink } = service.create(makeDesignInput('#fff'));
    const updated = service.updateByEdit(shareLink.editToken, {
      ...design,
      creamColor: '#abc',
    });
    expect(updated.id).toBe(design.id);
    expect(updated.creamColor).toBe('#abc');
    expect(service.getByView(shareLink.viewToken).creamColor).toBe('#abc');
  });

  it('열람 토큰으로는 편집 경로에 접근할 수 없다 (권한 분리)', () => {
    const { shareLink } = service.create(makeDesignInput());
    expect(() => service.getByEdit(shareLink.viewToken)).toThrow(DesignNotFoundError);
    expect(() => service.updateByEdit(shareLink.viewToken, makeDesignInput())).toThrow(
      DesignNotFoundError,
    );
  });

  it('열람 토큰으로 복제하면 새 id·새 토큰의 독립 디자인이 생긴다 (복제 후 수정)', () => {
    const original = service.create(makeDesignInput('#111'));
    const clone = service.cloneByView(original.shareLink.viewToken);

    expect(clone.design.id).not.toBe(original.design.id);
    expect(clone.shareLink.editToken).not.toBe(original.shareLink.editToken);
    expect(clone.shareLink.viewToken).not.toBe(original.shareLink.viewToken);

    // 복제본 수정이 원본에 영향을 주지 않는다(독립).
    service.updateByEdit(clone.shareLink.editToken, { ...clone.design, creamColor: '#999' });
    expect(service.getByView(clone.shareLink.viewToken).creamColor).toBe('#999');
    expect(service.getByView(original.shareLink.viewToken).creamColor).toBe('#111');
  });

  it('알 수 없는 토큰은 DesignNotFoundError', () => {
    expect(() => service.getByEdit('nope')).toThrow(DesignNotFoundError);
    expect(() => service.getByView('nope')).toThrow(DesignNotFoundError);
  });
});
