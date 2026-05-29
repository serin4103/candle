// assets/imageDimensions — 업로드 이미지 바이트에서 픽셀 치수를 읽는 순수 헬퍼.
// Asset.width/height 채우기용. 무거운 의존 없이 PNG·JPEG 헤더와 SVG 텍스트만
// 파싱한다. 못 읽으면 {0,0}(스키마 nonnegative 허용 — 렌더는 종횡비를 클라이언트
// 레지스트리에서 보강하므로 치명적이지 않다).

/** 허용 mime → 우리가 다루는 표준 형식. */
export type ImageKind = 'png' | 'jpeg' | 'svg';

export interface Dimensions {
  width: number;
  height: number;
}

/** PNG: 8바이트 시그니처 후 IHDR(폭·높이 big-endian 32bit, 오프셋 16·20). */
function pngDimensions(b: Uint8Array): Dimensions {
  if (b.length < 24) return { width: 0, height: 0 };
  const view = new DataView(b.buffer, b.byteOffset, b.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

/** JPEG: SOFn 마커(0xFFC0~0xCF, C4/C8/CC 제외)에서 높이·폭(big-endian 16bit). */
function jpegDimensions(b: Uint8Array): Dimensions {
  let i = 2; // SOI(FFD8) 다음부터
  // 폭은 getUint16(i+7)에서 i+8까지 읽으므로 i+8 < length를 보장한다.
  while (i + 8 < b.length) {
    if (b[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = b[i + 1]!;
    // SOF0~SOF15 중 치수를 담는 프레임 헤더(DHT=C4, JPG=C8, DAC=CC 제외).
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      const view = new DataView(b.buffer, b.byteOffset, b.byteLength);
      const height = view.getUint16(i + 5);
      const width = view.getUint16(i + 7);
      return { width, height };
    }
    // 세그먼트 길이만큼 건너뛴다(2바이트 길이 = 마커 뒤).
    const len = (b[i + 2]! << 8) | b[i + 3]!;
    if (len <= 0) break;
    i += 2 + len;
  }
  return { width: 0, height: 0 };
}

/** SVG: width/height 속성, 없으면 viewBox(셋째·넷째 값)에서 치수. */
function svgDimensions(text: string): Dimensions {
  const attr = (name: string): number => {
    const m = text.match(new RegExp(`\\b${name}\\s*=\\s*["']\\s*([\\d.]+)`, 'i'));
    return m ? parseFloat(m[1]!) : 0;
  };
  const w = attr('width');
  const h = attr('height');
  if (w > 0 && h > 0) return { width: Math.round(w), height: Math.round(h) };
  const vb = text.match(/viewBox\s*=\s*["']\s*[\d.]+\s+[\d.]+\s+([\d.]+)\s+([\d.]+)/i);
  if (vb) return { width: Math.round(parseFloat(vb[1]!)), height: Math.round(parseFloat(vb[2]!)) };
  return { width: 0, height: 0 };
}

/** mime을 우리가 다루는 형식으로 정규화. 비허용이면 undefined. */
export function imageKindForMime(mime: string): ImageKind | undefined {
  const m = mime.toLowerCase();
  if (m === 'image/png') return 'png';
  if (m === 'image/jpeg' || m === 'image/jpg') return 'jpeg';
  if (m === 'image/svg+xml' || m === 'image/svg') return 'svg';
  return undefined;
}

/** 바이트와 mime으로 픽셀 치수를 추정한다(못 읽으면 {0,0}). */
export function imageDimensions(bytes: Uint8Array, mime: string): Dimensions {
  switch (imageKindForMime(mime)) {
    case 'png':
      return pngDimensions(bytes);
    case 'jpeg':
      return jpegDimensions(bytes);
    case 'svg':
      return svgDimensions(new TextDecoder().decode(bytes));
    default:
      return { width: 0, height: 0 };
  }
}
