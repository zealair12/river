import type { CSSProperties, ReactNode } from 'react';

/** CSS glass (blur + border) — avoids liquid-glass-react anchor/transform bugs on corner positioning. */
export function GlassPanel({
  children,
  style,
  className,
  radius = 16,
  /** When false, skips CSS containment/isolation so children (e.g. liquid-glass) can backdrop-sample siblings like label text. */
  isolate = true
}: {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
  radius?: number;
  isolate?: boolean;
}) {
  return (
    <div
      className={className}
      style={{
        position: 'relative',
        borderRadius: radius,
        overflow: 'hidden',
        ...(isolate ? { isolation: 'isolate' as const, contain: 'layout paint' as const } : {}),
        background: 'rgba(6, 15, 11, 0.72)',
        backdropFilter: 'blur(22px) saturate(1.45)',
        WebkitBackdropFilter: 'blur(22px) saturate(1.45)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)',
        ...style
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 42%, transparent 58%, rgba(255,255,255,0.04) 100%)',
          borderRadius: radius
        }}
      />
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  );
}
