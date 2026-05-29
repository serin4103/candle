// editor2d/panels/LibraryPanel — 요소 라이브러리(View). 3개 카테고리 자산을
// 나열하고 클릭 시 store.addElement → 선택. 배치 기본 좌표(옆면 중앙)는
// shared/geometry(getNet)로 계산한다. 로직·상태는 store가 보유.
import { getNet } from '@candle/shared/geometry';
import type { ElementInput } from '../../document/store';
import { useDesignStore } from '../../document/store';
import { Panel, Button, palette } from '../../ui';
import { illustrations, pipingVariants, letteringFonts } from '../elements';

const DEFAULT_LETTER_COLOR = '#5a3b3b';
const DEFAULT_PIPING_COLOR = '#ffffff';

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

  // 새 요소는 옆면(전개) 중앙에 놓는다(전개도 좌표).
  const net = getNet(shape, spec);
  const center = { x: net.side.width / 2, y: net.side.height / 2 };

  const add = (input: AddInput) => {
    const id = addElement({
      ...input,
      transform: { x: center.x, y: center.y, scale: 1, rotation: 0 },
    } as ElementInput);
    select(id);
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
                src={a.src}
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
        <p style={sectionLabel}>파이핑</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {pipingVariants.map((v) => (
            <Button
              key={v.id}
              onClick={() => add({ type: 'piping', variant: v.id, color: DEFAULT_PIPING_COLOR })}
            >
              {v.label}
            </Button>
          ))}
        </div>
      </div>
    </Panel>
  );
}
