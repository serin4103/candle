// ui/ColorPicker — 팔레트 스와치 + 네이티브 컬러 인풋(PRD-M2). 순수 표현.
// 선택값은 콜백으로 위임만 한다(상태·도메인 비의존).
import { palette, radius } from './theme';

export interface ColorPickerProps {
  /** 현재 선택된 색. */
  value: string;
  /** 제공 팔레트 스와치. */
  swatches: readonly string[];
  /** 색 선택 콜백. */
  onChange: (color: string) => void;
  /** 접근성 라벨. */
  label?: string;
}

export function ColorPicker({ value, swatches, onChange, label }: ColorPickerProps) {
  const isCustom = !swatches.includes(value);
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
      {swatches.map((c) => {
        const selected = c.toLowerCase() === value.toLowerCase();
        return (
          <button
            key={c}
            aria-label={`${label ?? '색'} ${c}`}
            aria-pressed={selected}
            onClick={() => onChange(c)}
            style={{
              width: 28,
              height: 28,
              borderRadius: radius.pill,
              background: c,
              cursor: 'pointer',
              border: selected
                ? `2.5px solid ${palette.primaryDeep}`
                : `1px solid ${palette.border}`,
              boxShadow: selected ? `0 0 0 2px ${palette.primarySoft}` : 'none',
            }}
          />
        );
      })}
      {/* 컬러 피커: 팔레트 밖 임의 색 선택 */}
      <label
        aria-label={`${label ?? '색'} 직접 선택`}
        style={{
          width: 28,
          height: 28,
          borderRadius: radius.pill,
          border: isCustom
            ? `2.5px solid ${palette.primaryDeep}`
            : `1px dashed ${palette.textMuted}`,
          display: 'grid',
          placeItems: 'center',
          cursor: 'pointer',
          background: isCustom ? value : palette.surface,
          fontSize: 14,
          color: palette.textMuted,
          overflow: 'hidden',
        }}
      >
        {isCustom ? '' : '+'}
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
        />
      </label>
    </div>
  );
}
