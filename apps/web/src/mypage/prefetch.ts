// mypage/prefetch — 마이페이지 목록 선(先)요청 + 캐시 (PRD-S6 성능 보조).
// navigate()는 전체 페이지 리로드라 인메모리 캐시는 살아남지 못한다. 그래서
// 캐시는 sessionStorage에 둔다: 상단바 "마이페이지" 버튼에 hover/pointerdown 하는
// 순간(현재 페이지엔 이미 인증 토큰이 있다) 미리 listMyDesigns()를 쏴 캐시에 넣고,
// 리로드 뒤 MyPage가 캐시를 즉시 그린 다음(stale-while-revalidate) 백그라운드로 갱신한다.
// 호출·직렬화만 하는 api 계층과 달리, 캐시 정책은 화면 책임이라 mypage에 둔다.
import type { Design } from '@candle/shared';
import { listMyDesigns } from '../api';

/** 사용자별 캐시 키 — 로그아웃→다른 계정 로그인 시 남의 목록을 보여주지 않도록 분리. */
function cacheKey(userId: string): string {
  return `candle:mydesigns:${userId}`;
}

/** 동일 사용자에 대한 중복 prefetch를 막는 진행 중 요청. */
const inFlight = new Map<string, Promise<Design[]>>();

/** 캐시에서 이 사용자의 목록을 읽는다(없으면 null). 즉시 렌더 용. */
export function readCachedDesigns(userId: string): Design[] | null {
  try {
    const raw = sessionStorage.getItem(cacheKey(userId));
    return raw ? (JSON.parse(raw) as Design[]) : null;
  } catch {
    return null;
  }
}

/** 목록을 캐시에 저장(다음 진입에서 즉시 렌더). */
function writeCache(userId: string, designs: Design[]): void {
  try {
    sessionStorage.setItem(cacheKey(userId), JSON.stringify(designs));
  } catch {
    // 저장소 접근 불가(용량 초과 등)면 캐시 없이 동작 — 기능엔 영향 없음.
  }
}

/**
 * 목록을 미리 받아 캐시에 채운다. 상단바 버튼 hover/pointerdown에서 호출.
 * 진행 중 요청이 있으면 그걸 재사용(중복 호출 무해). 실패는 조용히 무시한다 —
 * prefetch는 가속일 뿐, MyPage가 다시 정식으로 요청하므로 오류 표시는 그쪽이 한다.
 */
export function prefetchMyDesigns(userId: string): Promise<Design[]> {
  const existing = inFlight.get(userId);
  if (existing) return existing;
  const p = listMyDesigns()
    .then((designs) => {
      writeCache(userId, designs);
      return designs;
    })
    .finally(() => {
      inFlight.delete(userId);
    });
  inFlight.set(userId, p);
  p.catch(() => {});
  return p;
}
