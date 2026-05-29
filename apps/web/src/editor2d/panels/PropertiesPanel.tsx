// editor2d/panels/PropertiesPanel — 선택 요소 속성 편집(View).
// 입력을 store 액션으로 위임만 한다(로직·계산 없음). 레터링은 텍스트·폰트·색상,
// 공통은 레이어 순서(앞/뒤)와 삭제.
import { Panel, Button, ColorPicker, palette, fontStack } from '../../ui';
import { useDesignStore } from '../../document/store';
import { letteringFonts } from '../elements';

const LETTER_SWATCHES = ['#5a3b3b', '#ffffff', '#e87f97', '#d6a23e', '#6b8e72', '#5b7fa6'] as const;

export function PropertiesPanel() {
  const selectedId = useDesignStore((s) => s.selectedId);
  const elements = useDesignStore((s) => s.design.elements);
  const updateLettering = useDesignStore((s) => s.updateLettering);
  const reorderElement = useDesignStore((s) => s.reorderElement);
  const deleteElement = useDesignStore((s) => s.deleteElement);

  const selected = elements.find((el) => el.id === selectedId) ?? null;
  if (!selected) {
    return (
      <Panel title="속성">
        <p style={{ fontSize: 13, color: palette.textMuted, margin: 0 }}>
          요소를 선택하면 속성을 편집할 수 있어요.
        </p>
      </Panel>
    );
  }

  // 레이어 앞/뒤로: 현재 최대/최소 zIndex 기준으로 한 칸 바깥.
  const maxZ = elements.reduce((m, el) => Math.max(m, el.zIndex), 0);
  const minZ = elements.reduce((m, el) => Math.min(m, el.zIndex), 0);

  const labelStyle = {
    fontSize: 13,
    fontWeight: 600,
    color: palette.textMuted,
    margin: '0 0 4px',
  } as const;

  return (
    <Panel title="속성">
      {selected.type === 'lettering' && (
        <>
          <div>
            <p style={labelStyle}>텍스트</p>
            <input
              value={selected.text}
              onChange={(e) => updateLettering(selected.id, { text: e.target.value })}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                fontFamily: fontStack,
                fontSize: 14,
                padding: '8px 10px',
                borderRadius: 12,
                border: `1px solid ${palette.border}`,
              }}
            />
          </div>
          <div>
            <p style={labelStyle}>폰트</p>
            <select
              value={selected.font}
              onChange={(e) => updateLettering(selected.id, { font: e.target.value })}
              style={{
                width: '100%',
                fontFamily: fontStack,
                fontSize: 14,
                padding: '8px 10px',
                borderRadius: 12,
                border: `1px solid ${palette.border}`,
                background: palette.surface,
              }}
            >
              {letteringFonts.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p style={labelStyle}>글자색</p>
            <ColorPicker
              label="글자색"
              value={selected.color}
              swatches={LETTER_SWATCHES}
              onChange={(c) => updateLettering(selected.id, { color: c })}
            />
          </div>
        </>
      )}

      <div>
        <p style={labelStyle}>레이어 순서</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            style={{ flex: 1 }}
            onClick={() => reorderElement(selected.id, maxZ + 1)}
          >
            맨 앞으로
          </Button>
          <Button
            style={{ flex: 1 }}
            onClick={() => reorderElement(selected.id, minZ - 1)}
          >
            맨 뒤로
          </Button>
        </div>
      </div>

      <Button variant="ghost" onClick={() => deleteElement(selected.id)}>
        삭제
      </Button>
    </Panel>
  );
}
