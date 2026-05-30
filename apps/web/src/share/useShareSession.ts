// share/useShareSession — 저장·공유 세션. 진입 경로(`/d/:id`·`/view/:token`)로
// 디자인을 store에 적재하고, 저장/수정/복제 명령을 제공한다(PRD-M5·S6).
// 저장은 로그인이 필요하다(서버 401) — App이 로그인 여부로 저장 버튼을 가드한다.
// 디자인 문서 자체는 store가 소유하고, 여기 상태는 세션(모드·토큰·링크) 표현용.
import { useCallback, useEffect, useState } from 'react';
import type { ShareLink } from '@candle/shared';
import { useDesignStore } from '../document/store';
import { saveDesign, loadById, loadByView, updateById, cloneByView } from '../api';
import { parseRoute, designUrl, navigate, replaceUrl, type ShareMode } from './route';

type Status = 'loading' | 'idle' | 'saving' | 'error';

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
  /** 열람 모드: 복제 후 복제본(`/d/:id`)으로 이동. */
  clone: () => Promise<void>;
}

export function useShareSession(): ShareSession {
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
        if (route.mode === 'design' && route.id) {
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
  }, [route, loadDesign]);

  const save = useCallback(async () => {
    setStatus('saving');
    setError(null);
    try {
      const result = await saveDesign(getDesignSnapshot());
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
      await updateById(designId, getDesignSnapshot());
      setStatus('idle');
    } catch (e) {
      setError((e as Error).message);
      setStatus('error');
    }
  }, [designId, getDesignSnapshot]);

  const clone = useCallback(async () => {
    if (route.mode !== 'view' || !route.token) return;
    setStatus('saving');
    setError(null);
    try {
      const result = await cloneByView(route.token);
      // 복제본은 복제자 소유의 독립 디자인 — 그 편집 URL로 이동(전체 리로드로 재적재).
      navigate(designUrl(result.design.id));
    } catch (e) {
      setError((e as Error).message);
      setStatus('error');
    }
  }, [route]);

  return { mode, status, error, shareLink, save, update, clone };
}
