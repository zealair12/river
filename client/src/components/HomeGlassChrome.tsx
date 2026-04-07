import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';

/**
 * Home-page glass: conic prismatic ring + backdrop stack + top caustic highlight.
 * Matches the sector slider’s “thick glass” language without duplicating SVG displacement (slider-only).
 */
export function HomeGlassChrome({
  children,
  radius = 18,
  ringPadding = 2,
  style,
  contentStyle,
  animatePrism = true,
  highlightStrength = 0.38
}: {
  children: ReactNode;
  radius?: number;
  ringPadding?: number;
  style?: CSSProperties;
  /** Padding inside the glass (e.g. around input or label). */
  contentStyle?: CSSProperties;
  animatePrism?: boolean;
  highlightStrength?: number;
}) {
  const [angle, setAngle] = useState(0);

  useEffect(() => {
    if (!animatePrism) return;
    let raf = 0;
    const loop = () => {
      setAngle((a) => (a + 0.05) % 360);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [animatePrism]);

  const outerR = radius + ringPadding;

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: outerR,
        padding: ringPadding,
        background: `conic-gradient(from ${angle}deg,
          rgba(255,255,255,0) 0%,
          rgba(255,255,255,0.22) 18%,
          rgba(0,229,200,0.28) 42%,
          rgba(255,255,255,0.12) 62%,
          rgba(0,229,200,0.15) 82%,
          rgba(255,255,255,0) 100%)`,
        boxSizing: 'border-box',
        ...style
      }}
    >
      <div
        style={{
          position: 'relative',
          borderRadius: radius,
          overflow: 'hidden',
          background: 'rgba(8, 18, 14, 0.38)',
          backdropFilter: 'blur(10px) saturate(1.82) brightness(1.07) contrast(1.05)',
          WebkitBackdropFilter: 'blur(10px) saturate(1.82) brightness(1.07) contrast(1.05)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.11), inset 0 -1px 0 rgba(0,0,0,0.12)'
        }}
      >
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '30%',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.12) 40%, transparent 100%)',
            opacity: highlightStrength,
            pointerEvents: 'none',
            borderRadius: `${radius}px ${radius}px 0 0`
          }}
        />
        <div style={{ position: 'relative', zIndex: 1, ...contentStyle }}>{children}</div>
      </div>
    </div>
  );
}
