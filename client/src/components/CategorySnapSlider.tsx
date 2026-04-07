import { useRef, useCallback, useEffect, useState, useId, useLayoutEffect } from 'react';
import { GlassPanel } from './GlassPanel';

export type CategoryFilter = string | null;

/** Outer padding from GlassPanel inner edge to label/thumb area */
const TRACK_PAD = 6;
/** Extra inset so the thumb sits inside the track border (2–3px breathing room) */
const THUMB_INSET = 3;

interface CategorySnapSliderProps {
  options: Array<{ value: CategoryFilter; label: string }>;
  value: CategoryFilter;
  onChange: (v: CategoryFilter) => void;
}

function snapIndex(clientX: number, rect: DOMRect, n: number): number {
  if (n <= 1) return 0;
  const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < n; i++) {
    const cx = ((i + 0.5) / n) * rect.width;
    const d = Math.abs(x - cx);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

export function CategorySnapSlider({ options, value, onChange }: CategorySnapSliderProps) {
  const reactId = useId();
  const lensFilterId = `lens-disp-${reactId.replace(/:/g, '')}`;
  const trackRef = useRef<HTMLDivElement>(null);
  const hitRef = useRef<HTMLDivElement>(null);
  const lastClientXRef = useRef(0);
  const lastMoveTsRef = useRef(performance.now());

  const [dragging, setDragging] = useState(false);
  const [dragLeftPct, setDragLeftPct] = useState<number | null>(null);
  const [prismAngle, setPrismAngle] = useState(0);
  const [highlightShiftPx, setHighlightShiftPx] = useState(0);
  const [trackWidthPx, setTrackWidthPx] = useState(0);
  /** feDisplacementMap scale — stronger lens; boosted by drag velocity */
  const [lensScale, setLensScale] = useState(14);

  const n = options.length;
  const activeIndex = Math.max(0, options.findIndex((o) => o.value === value));

  const thumbWidthPct = n <= 1 ? 100 : 100 / n;
  const snappedLeftPct = n <= 1 ? 0 : (activeIndex / n) * 100;
  const thumbLeftPct = dragLeftPct !== null ? dragLeftPct : snappedLeftPct;

  const innerPad = TRACK_PAD + THUMB_INSET;

  useLayoutEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setTrackWidthPx(el.getBoundingClientRect().width);
    });
    ro.observe(el);
    setTrackWidthPx(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      setPrismAngle((a) => (a + 0.04) % 360);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (dragging) return;
    const t = window.setInterval(() => {
      setLensScale((s) => (s > 14.3 ? s * 0.92 : 14));
    }, 32);
    return () => clearInterval(t);
  }, [dragging]);

  const setThumbFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const w = rect.width;
      if (w <= 0) return;
      const tw = n <= 1 ? w : w / n;
      const x = clientX - rect.left - tw / 2;
      const maxL = w - tw;
      const leftPx = Math.max(0, Math.min(maxL, x));
      setDragLeftPct((leftPx / w) * 100);
    },
    [n]
  );

  const commitSnap = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const idx = snapIndex(clientX, rect, n);
      onChange(options[idx].value);
      setDragLeftPct(null);
    },
    [n, onChange, options]
  );

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    hitRef.current?.setPointerCapture(e.pointerId);
    setDragging(true);
    lastClientXRef.current = e.clientX;
    lastMoveTsRef.current = performance.now();
    setThumbFromClientX(e.clientX);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - lastClientXRef.current;
    lastClientXRef.current = e.clientX;

    const now = performance.now();
    const dt = Math.max(1, now - lastMoveTsRef.current);
    lastMoveTsRef.current = now;
    const vel = Math.abs(dx) / dt;
    setLensScale((s) => {
      const target = 14 + Math.min(16, vel * 0.55);
      return s * 0.35 + target * 0.65;
    });

    setHighlightShiftPx((prev) => {
      const target = -dx * 0.1;
      return target * 0.4 + prev * 0.6;
    });
    setThumbFromClientX(e.clientX);
  };

  const endDrag = useCallback(
    (clientX: number) => {
      setDragging(false);
      commitSnap(clientX);
      setHighlightShiftPx(0);
    },
    [commitSnap]
  );

  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragging) return;
    endDrag(e.clientX);
    try {
      hitRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (!dragging) return;
    const up = (ev: PointerEvent) => {
      endDrag(ev.clientX);
    };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [dragging, endDrag]);

  useEffect(() => {
    if (dragging) return;
    const t = window.setInterval(() => {
      setHighlightShiftPx((h) => (Math.abs(h) < 0.3 ? 0 : h * 0.9));
    }, 40);
    return () => clearInterval(t);
  }, [dragging]);

  const W = trackWidthPx;
  const thumbLeftPx = W > 0 ? (thumbLeftPct / 100) * W : 0;
  /** Align duplicate flex row with the base label row (starts at innerPad) */
  const refractTranslateX = W > 0 ? innerPad - (thumbLeftPx + THUMB_INSET) : 0;

  const labelCellStyle = {
    flex: 1,
    minWidth: 0,
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    fontSize: 'clamp(7px, 1.05vw, 10px)' as const,
    fontWeight: 500,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
    padding: '0 4px',
    textAlign: 'center' as const
  };

  const innerContentWidth = Math.max(0, W - 2 * innerPad);

  return (
    <GlassPanel radius={22} isolate={false} style={{ width: '100%', maxWidth: 'min(92vw, 860px)' }}>
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
        <defs>
          <filter id={lensFilterId} x="-35%" y="-35%" width="170%" height="170%" colorInterpolationFilters="sRGB">
            {/* Smooth low-frequency map — lens-like warp, not rippling water */}
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.02 0.038"
              numOctaves="1"
              seed="42"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={lensScale}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      <div
        ref={trackRef}
        style={{
          position: 'relative',
          minHeight: 48,
          padding: TRACK_PAD
        }}
      >
        {/* Base labels — always visible and fixed; thumb/refracted layer overlays without hiding text */}
        <div
          style={{
            position: 'absolute',
            inset: innerPad,
            display: 'flex',
            alignItems: 'stretch',
            zIndex: 1,
            pointerEvents: 'none'
          }}
        >
          {options.map((opt) => (
            <div
              key={opt.value ?? 'all'}
              style={{
                ...labelCellStyle,
                color: 'rgba(255,255,255,0.78)',
                opacity: 1
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>

        {/* Refracted clone of labels — clipped to thumb lens; displacement simulates glass */}
        {W > 0 && (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              left: thumbLeftPx + THUMB_INSET,
              width: Math.max(0, (thumbWidthPct / 100) * W - 2 * THUMB_INSET),
              top: innerPad,
              bottom: innerPad,
              borderRadius: 16,
              overflow: 'hidden',
              zIndex: 2,
              pointerEvents: 'none',
              filter: `url(#${lensFilterId})`
            }}
          >
            <div
              style={{
                display: 'flex',
                width: innerContentWidth,
                height: '100%',
                alignItems: 'stretch',
                transform: `translateX(${refractTranslateX}px)`
              }}
            >
              {options.map((opt) => (
                <div
                  key={`r-${opt.value ?? 'all'}`}
                  style={{
                    ...labelCellStyle,
                    color: 'rgba(255,255,255,0.88)'
                  }}
                >
                  {opt.label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Thumb chrome + blur only on behind-layer; label stays sharp above */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: thumbLeftPx + THUMB_INSET,
            width: Math.max(0, (thumbWidthPct / 100) * W - 2 * THUMB_INSET),
            top: innerPad,
            bottom: innerPad,
            zIndex: 3,
            pointerEvents: 'none'
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 18,
              padding: 2,
              background: `conic-gradient(from ${prismAngle}deg,
                rgba(255,255,255,0) 0%,
                rgba(255,255,255,0.18) 22%,
                rgba(0,229,200,0.2) 48%,
                rgba(255,255,255,0.1) 72%,
                rgba(255,255,255,0) 100%)`,
              boxSizing: 'border-box'
            }}
          >
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                minHeight: 28,
                borderRadius: 16,
                overflow: 'hidden',
                isolation: 'isolate'
              }}
            >
              {/* Blur + tint — behind text */}
              <div
                aria-hidden
                style={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 0,
                  borderRadius: 16,
                  background: 'rgba(8, 18, 14, 0.32)',
                  backdropFilter: 'blur(4px) saturate(1.55) brightness(1.05) contrast(1.03)',
                  WebkitBackdropFilter: 'blur(4px) saturate(1.55) brightness(1.05) contrast(1.03)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.1)'
                }}
              />
              <div
                aria-hidden
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '28%',
                  zIndex: 1,
                  background:
                    'linear-gradient(180deg, rgba(255,255,255,0.38) 0%, rgba(255,255,255,0.06) 50%, transparent 100%)',
                  opacity: 0.45,
                  transform: `translateX(${highlightShiftPx}px)`,
                  transition: dragging ? 'none' : 'transform 0.35s ease-out',
                  pointerEvents: 'none',
                  borderRadius: '16px 16px 0 0'
                }}
              />
              <div
                aria-hidden
                style={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 1,
                  borderRadius: 16,
                  pointerEvents: 'none',
                  background: 'linear-gradient(145deg, rgba(0,229,200,0.06) 0%, transparent 55%)'
                }}
              />
              {!dragging && (
                <div
                  style={{
                    position: 'relative',
                    zIndex: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    minHeight: 28,
                    padding: '0 4px',
                    fontSize: 'clamp(7px, 1.05vw, 10px)',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'rgba(255,255,255,0.95)',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    textShadow: '0 1px 2px rgba(0,0,0,0.35)'
                  }}
                >
                  {options[activeIndex]?.label ?? ''}
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          ref={hitRef}
          role="slider"
          aria-valuenow={activeIndex}
          aria-valuemin={0}
          aria-valuemax={Math.max(0, n - 1)}
          aria-label="Category filter"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          style={{
            position: 'absolute',
            inset: TRACK_PAD,
            zIndex: 4,
            cursor: dragging ? 'grabbing' : 'grab',
            touchAction: 'none',
            userSelect: 'none'
          }}
        />
      </div>
    </GlassPanel>
  );
}
