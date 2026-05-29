// ui/Button — 공통 버튼(파스텔 톤). 순수 표현 컴포넌트.
import type { ButtonHTMLAttributes, CSSProperties } from 'react';
import { palette, radius, shadow, fontStack } from './theme';

type Variant = 'primary' | 'ghost';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  active?: boolean;
}

export function Button({ variant = 'ghost', active = false, style, ...rest }: ButtonProps) {
  const base: CSSProperties = {
    fontFamily: fontStack,
    fontSize: 14,
    fontWeight: 600,
    cursor: rest.disabled ? 'not-allowed' : 'pointer',
    border: '1px solid transparent',
    borderRadius: radius.md,
    padding: '8px 14px',
    transition: 'all 0.15s ease',
    opacity: rest.disabled ? 0.5 : 1,
  };
  const variants: Record<Variant, CSSProperties> = {
    primary: {
      background: palette.primary,
      color: '#fff',
      boxShadow: shadow.soft,
    },
    ghost: {
      background: active ? palette.primarySoft : palette.surface,
      color: active ? palette.primaryDeep : palette.text,
      borderColor: active ? palette.primary : palette.border,
    },
  };
  return <button {...rest} style={{ ...base, ...variants[variant], ...style }} />;
}
