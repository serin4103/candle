// editor2d/elements/imageAssets — 업로드 이미지(PRD-S4)의 클라이언트 레지스트리.
// schema ImageElement는 assetId만 들고 있다(문서 비대화 방지). 렌더에 필요한
// data URI·치수는 여기에 assetId로 보관한다 — 일러스트의 번들된 자산 맵과 동형.
//
// 왜 data URI인가: 3D 굽기(viewer3d/texture)는 전개도 SVG를 data URL 이미지로
// 캔버스에 그린다. 외부 URL을 SVG 안에 두면 로드 차단·캔버스 오염으로 텍스처가
// 깨진다. 그래서 일러스트와 동일하게 이미지를 data URI로 임베드한다.
//
// 순수 조회(getImageAsset)·등록(registerImageAsset)은 DOM 없이 동작(테스트 시드 가능).
// File/네트워크에서 data URI를 만드는 helper만 DOM(브라우저)에 의존한다.
// (재적재 훅 useResolveImageAssets는 React 의존이라 별 파일로 분리 — 이 모듈은
//  catalog(Model)도 import하므로 React를 끌어오지 않게 둔다.)
import { create } from 'zustand';
import { assetRawSrc } from '../../api';

/** 렌더에 필요한, 해석 완료된 이미지 자산. */
export interface ResolvedImage {
  /** 임베드 가능한 data URI(2D·3D 공통 렌더 소스). */
  dataUri: string;
  /** 원본 픽셀 치수(종횡비 산정용). 모르면 0. */
  width: number;
  height: number;
}

interface ImageAssetState {
  assets: Record<string, ResolvedImage>;
  /** 등록 때마다 증가 — View가 구독해 재렌더/재굽기를 트리거한다. */
  version: number;
  register: (id: string, resolved: ResolvedImage) => void;
}

/** assetId → 해석된 이미지 레지스트리(전역, 디자인 문서와 분리). */
export const useImageAssetStore = create<ImageAssetState>((set) => ({
  assets: {},
  version: 0,
  register: (id, resolved) =>
    set((s) => ({ assets: { ...s.assets, [id]: resolved }, version: s.version + 1 })),
}));

/** 동기 조회(순수 빌더용). 없으면 undefined → 자리표시 렌더. */
export function getImageAsset(id: string): ResolvedImage | undefined {
  return useImageAssetStore.getState().assets[id];
}

/** 해석된 자산 등록(업로드·재적재 공통). */
export function registerImageAsset(id: string, resolved: ResolvedImage): void {
  useImageAssetStore.getState().register(id, resolved);
}

// ── DOM 의존 helper(브라우저 전용) ──────────────────────────────────

/** Blob을 data URI 문자열로 읽는다. */
function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('파일을 읽지 못했습니다.'));
    reader.readAsDataURL(blob);
  });
}

/** data URI를 이미지로 로드해 자연 치수를 구한다(못 구하면 0). */
function imageSize(dataUri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = dataUri;
  });
}

/** 업로드한 File에서 즉시 해석(서버 왕복 없이 로컬 미리보기 가능). */
export async function fileToImageAsset(file: File): Promise<ResolvedImage> {
  const dataUri = await blobToDataUri(file);
  const { width, height } = await imageSize(dataUri);
  return { dataUri, width, height };
}

/** 재적재(공유 링크 진입 등): 서버 원본 바이트를 받아 data URI로 해석. */
export async function resolveImageAsset(assetId: string): Promise<ResolvedImage> {
  const res = await fetch(assetRawSrc(assetId));
  if (!res.ok) throw new Error(`자산 로드 실패 (HTTP ${res.status})`);
  const blob = await res.blob();
  const dataUri = await blobToDataUri(blob);
  const { width, height } = await imageSize(dataUri);
  return { dataUri, width, height };
}
