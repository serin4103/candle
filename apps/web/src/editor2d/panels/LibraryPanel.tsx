// editor2d/panels/LibraryPanel — 요소 라이브러리(View). 3개 카테고리 자산을
// 나열하고 클릭 시 store.addElement → 선택. 배치 기본 좌표(옆면 중앙)는
// shared/geometry(getNet)로 계산한다. 로직·상태는 store가 보유.
import { useRef, useState } from 'react';
import { getNet } from '@candle/shared/geometry';
import type { ElementInput } from '../../document/store';
import { useDesignStore } from '../../document/store';
import { uploadAsset } from '../../api';
import { Panel, Button, palette } from '../../ui';
import {
  illustrations,
  letteringFonts,
  illustrationDataUri,
  fileToImageAsset,
  registerImageAsset,
} from '../elements';

/** 업로드 허용 타입(PRD-S4). input accept·1차 안내용 — 최종 검증은 서버. */
const IMAGE_ACCEPT = 'image/png,image/jpeg,image/svg+xml';

const DEFAULT_LETTER_COLOR = '#5a3b3b';

/** transform 없이 추가할 요소 입력(유니온 보존을 위해 분배 Omit). */
type AddInput = ElementInput extends infer T
  ? T extends unknown
    ? Omit<T, 'transform'>
    : never
  : never;

export function LibraryPanel() {
  const shape = useDesignStore((s) => s.design.shape);
  const spec = useDesignStore((s) => s.design.spec);
  const addElement = useDesignStore((s) => s.addElement);
  const select = useDesignStore((s) => s.select);

  // 새 요소는 옆면(전개) 중앙에 놓는다(전개도 좌표 — 옆면 위치 반영).
  const net = getNet(shape, spec);
  const center = {
    x: net.side.x + net.side.width / 2,
    y: net.side.y + net.side.height / 2,
  };

  const add = (input: AddInput) => {
    const id = addElement({
      ...input,
      transform: { x: center.x, y: center.y, scale: 1, rotation: 0 },
    } as ElementInput);
    select(id);
  };

  // 이미지 업로드(PRD-S4): 서버 업로드 + 로컬에서 즉시 data URI 해석을 병행해
  // 왕복 없이 바로 렌더한다. 검증(타입·크기)은 서버 경계가 최종 책임.
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // 같은 파일 재선택 허용
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const [asset, resolved] = await Promise.all([uploadAsset(file), fileToImageAsset(file)]);
      registerImageAsset(asset.id, resolved);
      add({ type: 'image', assetId: asset.id });
    } catch (err) {
      setUploadError((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const tileStyle = {
    width: 48,
    height: 48,
    display: 'grid',
    placeItems: 'center',
    fontSize: 24,
    padding: 0,
  } as const;

  const sectionLabel = {
    fontSize: 13,
    fontWeight: 600,
    color: palette.textMuted,
    margin: '0 0 6px',
  } as const;

  return (
    <Panel title="요소">
      <div>
        <p style={sectionLabel}>일러스트</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {illustrations.map((a) => (
            <Button
              key={a.id}
              aria-label={a.label}
              title={a.label}
              style={tileStyle}
              onClick={() => add({ type: 'illustration', assetId: a.id })}
            >
              <img
                src={illustrationDataUri(a)}
                alt={a.label}
                style={{ width: 36, height: 36, objectFit: 'contain', pointerEvents: 'none' }}
              />
            </Button>
          ))}
        </div>
      </div>

      <div>
        <p style={sectionLabel}>레터링</p>
        <Button
          variant="primary"
          onClick={() =>
            add({
              type: 'lettering',
              text: '문구',
              font: letteringFonts[0]!.value,
              color: DEFAULT_LETTER_COLOR,
            })
          }
        >
          + 텍스트 추가
        </Button>
      </div>

      <div>
        <p style={sectionLabel}>이미지</p>
        <p style={{ fontSize: 12, color: palette.textMuted, margin: '0 0 6px' }}>
          PNG·JPG·SVG, 최대 50MB.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept={IMAGE_ACCEPT}
          onChange={onFile}
          style={{ display: 'none' }}
        />
        <Button
          variant="primary"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? '업로드 중…' : '+ 이미지 업로드'}
        </Button>
        {uploadError && (
          <p style={{ fontSize: 12, color: '#c0392b', margin: '6px 0 0' }}>
            {uploadError}
          </p>
        )}
      </div>
    </Panel>
  );
}
