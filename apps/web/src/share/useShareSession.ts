// share/useShareSession — 저장·공유 세션. 진입 경로(`/d/:id`·`/view/:token`)로
// 디자인을 store에 적재하고, 저장/수정/복제 명령을 제공한다(PRD-M5·S6).
// 저장은 로그인이 필요하다(서버 401) — App이 로그인 여부로 저장 버튼을 가드한다.
// 복제는 비로그인으로 가능하다(서버 저장 없이 클라이언트에서 복사 → 새 탭 편집).
// 디자인 문서 자체는 store가 소유하고, 여기 상태는 세션(모드·토큰·링크) 표현용.
import { useCallback, useEffect, useState } from 'react';
import type { Design, ShareLink } from '@candle/shared';
import { useDesignStore } from '../document/store';
import { saveDesign, loadById, loadByView, updateById, uploadAsset } from '../api';
import { buildTopThumbnail } from '../viewer3d/texture';
import { parseRoute, designUrl, replaceUrl, type ShareMode } from './route';

type Status = 'loading' | 'idle' | 'saving' | 'error';

/** 복제 핸드오프 키 — 복제 시 디자인을 담아 두고, 새 탭의 '신규' 진입이 읽어 적재. */
const CLONE_KEY = 'candle:clone';

/**
 * 저장 직전 케이크 윗면을 PNG로 구워 오브젝트 스토리지에 올리고, 그 자산 id를
 * 디자인에 실어 돌려준다(마이페이지 썸네일, PRD-S6 보강). **베스트에포트** —
 * 굽기/업로드가 실패해도 저장은 막지 않는다(썸네일 없이 진행).
 */
async function withTopThumbnail(design: Design): Promise<Design> {
  try {
    const blob = await buildTopThumbnail(design);
    const file = new File([blob], `${design.id || 'thumb'}.png`, { type: 'image/png' });
    const asset = await uploadAsset(file);
    return { ...design, thumbnailAssetId: asset.id };
  } catch {
    return design;
  }
}

/** 새 탭이 마운트 시 1회 읽어 가는 복제 디자인. 읽으면 즉시 비운다. */
function takeClonePayload(): Design | null {
  try {
    const raw = localStorage.getItem(CLONE_KEY);
    if (!raw) return null;
    localStorage.removeItem(CLONE_KEY);
    return JSON.parse(raw) as Design;
  } catch {
    return null;
  }
}

export interface ShareSession {
  mode: ShareMode;
  status: Status;
  error: string | null;
  /** 발급된 열람 링크(저장·소유 진입 시). 열람/신규 미저장 모드에선 null. */
  shareLink: ShareLink | null;
  /** 신규 저장(로그인 필요) → 디자인 id 부여, `/d/:id`로 승격. */
  save: () => Promise<void>;
  /** 소유 디자인 수정 저장. */
  update: () => Promise<void>;
  /** 열람 모드: 디자인을 복사해 새 탭의 편집 화면으로 연다(비로그인 가능, 서버 저장 X). */
  clone: () => void;
}

/**
 * @param authReady 로그인 세션 복원이 끝났는지(토큰이 api 클라이언트에 세팅됐는지).
 *   `/d/:id`(소유자 전용) 로드는 토큰이 준비된 뒤 실행해야 401 레이스를 피한다.
 */
export function useShareSession(authReady: boolean): ShareSession {
  // 진입 경로는 마운트 시점에 한 번 확정한다.
  const [route] = useState(() => parseRoute());
  // 저장 후 new→design으로 승격하므로 mode·id는 상태로 둔다.
  const [mode, setMode] = useState<ShareMode>(route.mode);
  const [designId, setDesignId] = useState<string | null>(route.id);
  const [status, setStatus] = useState<Status>(
    route.mode === 'design' || route.mode === 'view' ? 'loading' : 'idle',
  );
  const [error, setError] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<ShareLink | null>(null);
  const loadDesign = useDesignStore((s) => s.loadDesign);
  const getDesignSnapshot = useDesignStore((s) => s.getDesignSnapshot);

  // 진입 시 경로로 서버 디자인을 적재.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        if (route.mode === 'new') {
          // 비로그인 복제로 새 탭이 열렸으면, 복사된 디자인을 새 문서로 적재한다.
          // 새 id를 부여해 독립 문서로 시작(저장 시 서버가 다시 id를 부여하므로 무방).
          const cloned = takeClonePayload();
          if (cloned && !cancelled) loadDesign({ ...cloned, id: crypto.randomUUID() });
          return;
        }
        if (route.mode === 'design' && route.id) {
          // 소유자 전용 로드는 토큰이 준비된 뒤에만(미준비면 대기 — authReady가
          // true로 바뀌며 이 effect가 다시 실행된다). 토큰 없이 보내면 401.
          if (!authReady) return;
          const result = await loadById(route.id);
          if (cancelled) return;
          loadDesign(result.design);
          setShareLink(result.shareLink);
        } else if (route.mode === 'view' && route.token) {
          const design = await loadByView(route.token);
          if (cancelled) return;
          loadDesign(design);
        } else {
          return;
        }
        if (!cancelled) setStatus('idle');
      } catch (e) {
        if (!cancelled) {
          setError((e as Error).message);
          setStatus('error');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [route, authReady, loadDesign]);

  const save = useCallback(async () => {
    setStatus('saving');
    setError(null);
    try {
      const result = await saveDesign(await withTopThumbnail(getDesignSnapshot()));
      // 서버가 부여한 id를 store에 동기화하고 화면을 /d/:id로 승격한다.
      loadDesign(result.design);
      setShareLink(result.shareLink);
      setDesignId(result.design.id);
      setMode('design');
      setStatus('idle');
      replaceUrl(designUrl(result.design.id));
    } catch (e) {
      setError((e as Error).message);
      setStatus('error');
    }
  }, [getDesignSnapshot, loadDesign]);

  const update = useCallback(async () => {
    if (!designId) return;
    setStatus('saving');
    setError(null);
    try {
      await updateById(designId, await withTopThumbnail(getDesignSnapshot()));
      setStatus('idle');
    } catch (e) {
      setError((e as Error).message);
      setStatus('error');
    }
  }, [designId, getDesignSnapshot]);

  const clone = useCallback(() => {
    // 비로그인 복제: 현재 열람 중인 디자인(케이크·요소)을 그대로 복사해 새 탭의
    // 편집 화면으로 연다. 서버 저장은 하지 않으며, 저장은 새 탭에서 로그인 후 수행.
    // window.open은 클릭 제스처 내에서 동기로 호출해야 팝업 차단을 피한다.
    try {
      localStorage.setItem(CLONE_KEY, JSON.stringify(getDesignSnapshot()));
    } catch {
      // 저장소 접근 불가 시에도 새 탭은 연다(빈 새 디자인으로 시작).
    }
    window.open(`${window.location.origin}/`, '_blank', 'noopener');
  }, [getDesignSnapshot]);

  return { mode, status, error, shareLink, save, update, clone };
}
