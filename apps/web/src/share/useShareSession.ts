// share/useShareSession — 저장·링크 공유 세션(비로그인). 진입 시 토큰으로
// 디자인을 store에 적재하고, 저장/수정/복제 명령을 제공한다.
// 디자인 문서 자체는 store가 소유하고, 여기 useState는 공유 세션(토큰·상태)
// 표현용이다(App의 뷰 토글과 같은 표현 상태 — 디자인 문서 아님).
import { useCallback, useEffect, useState } from 'react';
import type { ShareLink } from '@candle/shared';
import { useDesignStore } from '../document/store';
import { saveDesign, loadByEdit, loadByView, updateByEdit, cloneByView } from '../api';
import {
  parseRoute,
  editUrl,
  navigate,
  replaceUrl,
  type ShareMode,
} from './route';

type Status = 'loading' | 'idle' | 'saving' | 'error';

export interface ShareSession {
  mode: ShareMode;
  status: Status;
  error: string | null;
  /** 발급된 링크(신규 저장·편집 진입 시). 열람 모드에선 null. */
  shareLink: ShareLink | null;
  /** 신규 저장 → 편집/열람 링크 발급. */
  save: () => Promise<void>;
  /** 편집 모드: 작성자 수정 저장. */
  update: () => Promise<void>;
  /** 열람 모드: 복제 후 복제본 편집 화면으로 이동. */
  clone: () => Promise<void>;
}

export function useShareSession(): ShareSession {
  // 진입 경로는 마운트 시점에 한 번 확정한다.
  const [route] = useState(() => parseRoute());
  const [status, setStatus] = useState<Status>(route.mode === 'new' ? 'idle' : 'loading');
  const [error, setError] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<ShareLink | null>(null);
  const loadDesign = useDesignStore((s) => s.loadDesign);
  const getDesignSnapshot = useDesignStore((s) => s.getDesignSnapshot);

  // 진입 시 토큰으로 서버 디자인을 적재.
  useEffect(() => {
    const token = route.token;
    if (!token) return;
    let cancelled = false;
    void (async () => {
      try {
        if (route.mode === 'edit') {
          const result = await loadByEdit(token);
          if (cancelled) return;
          loadDesign(result.design);
          setShareLink(result.shareLink);
        } else if (route.mode === 'view') {
          const design = await loadByView(token);
          if (cancelled) return;
          loadDesign(design);
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
      setShareLink(result.shareLink);
      setStatus('idle');
      // 저장 후 현재 화면을 편집 링크로 승격(작성자가 같은 링크로 재수정).
      replaceUrl(editUrl(result.shareLink.editToken));
    } catch (e) {
      setError((e as Error).message);
      setStatus('error');
    }
  }, [getDesignSnapshot]);

  const update = useCallback(async () => {
    if (route.mode !== 'edit' || !route.token) return;
    setStatus('saving');
    setError(null);
    try {
      await updateByEdit(route.token, getDesignSnapshot());
      setStatus('idle');
    } catch (e) {
      setError((e as Error).message);
      setStatus('error');
    }
  }, [route, getDesignSnapshot]);

  const clone = useCallback(async () => {
    if (route.mode !== 'view' || !route.token) return;
    setStatus('saving');
    setError(null);
    try {
      const result = await cloneByView(route.token);
      // 복제본은 독립 디자인 — 그 편집 링크로 이동(전체 리로드로 재적재).
      navigate(editUrl(result.shareLink.editToken));
    } catch (e) {
      setError((e as Error).message);
      setStatus('error');
    }
  }, [route]);

  return { mode: route.mode, status, error, shareLink, save, update, clone };
}
