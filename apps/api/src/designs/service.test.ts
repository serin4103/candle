// designs 서비스 단위 테스트 — PRD-S6 소유권 + PRD-M5 열람 공유를 증명한다.
// 인메모리 저장소(네트워크 없음)로 도메인 로직을 검증한다.
import { describe, it, expect, beforeEach } from 'vitest';
import { ForbiddenError } from '../auth';
import { createInMemoryRepository } from '../infra';
import { createDesignService, DesignNotFoundError, type DesignService } from './service';

const ALICE = 'user-alice';
const BOB = 'user-bob';

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

describe('DesignService (PRD-S6 소유권 + PRD-M5 공유)', () => {
  let service: DesignService;

  beforeEach(() => {
    service = createDesignService(createInMemoryRepository());
  });

  it('저장하면 서버 id와 열람 토큰을 발급한다(편집 토큰 없음)', async () => {
    const { design, shareLink } = await service.create(makeDesignInput(), ALICE);
    expect(design.id).toBeTruthy();
    expect(shareLink.designId).toBe(design.id);
    expect(shareLink.viewToken).toBeTruthy();
    expect((shareLink as Record<string, unknown>).editToken).toBeUndefined();
  });

  it('소유자는 id로 디자인과 열람 링크를 로드한다', async () => {
    const { design, shareLink } = await service.create(makeDesignInput(), ALICE);
    const loaded = await service.getById(design.id, ALICE);
    expect(loaded.design.id).toBe(design.id);
    expect(loaded.shareLink.viewToken).toBe(shareLink.viewToken);
  });

  it('소유자가 아니면 로드·수정이 거부된다(403)', async () => {
    const { design } = await service.create(makeDesignInput(), ALICE);
    await expect(service.getById(design.id, BOB)).rejects.toThrow(ForbiddenError);
    await expect(
      service.updateById(design.id, BOB, makeDesignInput('#abc')),
    ).rejects.toThrow(ForbiddenError);
  });

  it('소유자는 수정할 수 있다(id 유지)', async () => {
    const { design, shareLink } = await service.create(makeDesignInput('#fff'), ALICE);
    const updated = await service.updateById(design.id, ALICE, {
      ...design,
      creamColor: '#abc',
    });
    expect(updated.id).toBe(design.id);
    expect(updated.creamColor).toBe('#abc');
    // 열람 링크로도 갱신된 내용이 보인다.
    expect((await service.getByView(shareLink.viewToken)).creamColor).toBe('#abc');
  });

  it('마이페이지: 내 디자인만 목록에 나온다', async () => {
    const a1 = await service.create(makeDesignInput('#a1'), ALICE);
    const a2 = await service.create(makeDesignInput('#a2'), ALICE);
    await service.create(makeDesignInput('#b1'), BOB);

    const mine = await service.listMine(ALICE);
    const ids = mine.map((d) => d.id).sort();
    expect(ids).toEqual([a1.design.id, a2.design.id].sort());
    expect((await service.listMine(BOB)).length).toBe(1);
  });

  it('열람 토큰으로 복제하면 복제자 소유의 독립 디자인이 생긴다', async () => {
    const original = await service.create(makeDesignInput('#111'), ALICE);
    const clone = await service.cloneByView(original.shareLink.viewToken, BOB);

    expect(clone.design.id).not.toBe(original.design.id);
    expect(clone.shareLink.viewToken).not.toBe(original.shareLink.viewToken);

    // 복제본은 BOB 소유 — BOB는 수정 가능, ALICE는 403.
    await service.updateById(clone.design.id, BOB, { ...clone.design, creamColor: '#999' });
    await expect(service.getById(clone.design.id, ALICE)).rejects.toThrow(ForbiddenError);

    // 복제본 수정이 원본에 영향을 주지 않는다(독립).
    expect((await service.getByView(clone.shareLink.viewToken)).creamColor).toBe('#999');
    expect((await service.getByView(original.shareLink.viewToken)).creamColor).toBe('#111');
  });

  it('알 수 없는 id/토큰은 DesignNotFoundError', async () => {
    await expect(service.getById('nope', ALICE)).rejects.toThrow(DesignNotFoundError);
    await expect(service.getByView('nope')).rejects.toThrow(DesignNotFoundError);
  });
});
