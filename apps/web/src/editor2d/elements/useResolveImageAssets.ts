// editor2d/elements/useResolveImageAssets — 재적재 시 이미지 자산 보강 훅(View 측).
// 디자인 문서는 assetId만 들고 있으므로, 공유/복제로 다른 기기에서 열면 레지스트리가
// 비어 있다. 문서의 image 요소를 보고 빠진 자산을 서버에서 받아 등록한다.
// React 의존이라 순수 레지스트리(imageAssets.ts)와 분리한다. App에 한 번 마운트.
import { useEffect } from 'react';
import { useDesignStore } from '../../document/store';
import { getImageAsset, registerImageAsset, resolveImageAsset } from './imageAssets';

/** 이미 해석 중인 id(중복 fetch 방지). */
const inFlight = new Set<string>();

export function useResolveImageAssets(): void {
  const elements = useDesignStore((s) => s.design.elements);
  useEffect(() => {
    for (const el of elements) {
      if (el.type !== 'image') continue;
      const id = el.assetId;
      if (getImageAsset(id) || inFlight.has(id)) continue;
      inFlight.add(id);
      void resolveImageAsset(id)
        .then((resolved) => registerImageAsset(id, resolved))
        .catch(() => {})
        .finally(() => inFlight.delete(id));
    }
  }, [elements]);
}
