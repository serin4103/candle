// designs 서비스 단위 테스트 — PRD-M5 완료 기준을 직접 증명한다.
// 인메모리 저장소(네트워크 없음)로 도메인 로직을 검증한다.
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

  it('저장하면 디자인과 편집/열람 토큰을 발급한다 (서버 저장)', async () => {
    const { design, shareLink } = await service.create(makeDesignInput());
    expect(design.id).toBeTruthy();
    expect(shareLink.designId).toBe(design.id);
    expect(shareLink.editToken).toBeTruthy();
    expect(shareLink.viewToken).toBeTruthy();
  });

  it('편집/열람 토큰은 서로 다른 고유 값이다 (서로 다른 URL)', async () => {
    const a = await service.create(makeDesignInput());
    const b = await service.create(makeDesignInput());
    const tokens = [
      a.shareLink.editToken,
      a.shareLink.viewToken,
      b.shareLink.editToken,
      b.shareLink.viewToken,
    ];
    expect(new Set(tokens).size).toBe(4);
  });

  it('편집/열람 토큰으로 같은 문서를 로드한다', async () => {
    const { design, shareLink } = await service.create(makeDesignInput());
    const edit = await service.getByEdit(shareLink.editToken);
    expect(edit.design.id).toBe(design.id);
    // 작성자 로드는 두 링크를 함께 돌려준다.
    expect(edit.shareLink.editToken).toBe(shareLink.editToken);
    expect(edit.shareLink.viewToken).toBe(shareLink.viewToken);
    expect((await service.getByView(shareLink.viewToken)).id).toBe(design.id);
  });

  it('편집 토큰으로 작성자가 수정할 수 있다 (id 유지)', async () => {
    const { design, shareLink } = await service.create(makeDesignInput('#fff'));
    const updated = await service.updateByEdit(shareLink.editToken, {
      ...design,
      creamColor: '#abc',
    });
    expect(updated.id).toBe(design.id);
    expect(updated.creamColor).toBe('#abc');
    expect((await service.getByView(shareLink.viewToken)).creamColor).toBe('#abc');
  });

  it('열람 토큰으로는 편집 경로에 접근할 수 없다 (권한 분리)', async () => {
    const { shareLink } = await service.create(makeDesignInput());
    await expect(service.getByEdit(shareLink.viewToken)).rejects.toThrow(DesignNotFoundError);
    await expect(
      service.updateByEdit(shareLink.viewToken, makeDesignInput()),
    ).rejects.toThrow(DesignNotFoundError);
  });

  it('열람 토큰으로 복제하면 새 id·새 토큰의 독립 디자인이 생긴다 (복제 후 수정)', async () => {
    const original = await service.create(makeDesignInput('#111'));
    const clone = await service.cloneByView(original.shareLink.viewToken);

    expect(clone.design.id).not.toBe(original.design.id);
    expect(clone.shareLink.editToken).not.toBe(original.shareLink.editToken);
    expect(clone.shareLink.viewToken).not.toBe(original.shareLink.viewToken);

    // 복제본 수정이 원본에 영향을 주지 않는다(독립).
    await service.updateByEdit(clone.shareLink.editToken, {
      ...clone.design,
      creamColor: '#999',
    });
    expect((await service.getByView(clone.shareLink.viewToken)).creamColor).toBe('#999');
    expect((await service.getByView(original.shareLink.viewToken)).creamColor).toBe('#111');
  });

  it('알 수 없는 토큰은 DesignNotFoundError', async () => {
    await expect(service.getByEdit('nope')).rejects.toThrow(DesignNotFoundError);
    await expect(service.getByView('nope')).rejects.toThrow(DesignNotFoundError);
  });
});
