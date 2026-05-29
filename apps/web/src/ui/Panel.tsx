// ui/Panel — 라운드 카드/섹션 컨테이너. 순수 표현 컴포넌트.
import type { CSSProperties, ReactNode } from 'react';
import { palette, radius, shadow, fontStack } from './theme';

export interface PanelProps {
  title?: string;
  children: ReactNode;
  style?: CSSProperties;
}

export function Panel({ title, children, style }: PanelProps) {
  return (
    <section
      style={{
        fontFamily: fontStack,
        background: palette.surface,
        borderRadius: radius.lg,
        boxShadow: shadow.card,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        ...style,
      }}
    >
      {title && (
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: palette.text }}>
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}
