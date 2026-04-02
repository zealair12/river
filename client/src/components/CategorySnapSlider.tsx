import { useRef, useCallback, useEffect, useState } from 'react';
import LiquidGlass from 'liquid-glass-react';
import { GlassPanel } from './GlassPanel';

export type CategoryFilter = string | null;

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
  const trackRef = useRef<HTMLDivElement>(null);
  const hitRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [dragLeftPct, setDragLeftPct] = useState<number | null>(null);

  const n = options.length;
  const activeIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const lastSnapIdxRef = useRef(activeIndex);

  useEffect(() => {
    lastSnapIdxRef.current = activeIndex;
  }, [activeIndex]);

  const thumbWidthPct = n <= 1 ? 100 : 100 / n;
  const snappedLeftPct = n <= 1 ? 0 : (activeIndex / n) * 100;
  const thumbLeftPct = dragLeftPct !== null ? dragLeftPct : snappedLeftPct;

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
      lastSnapIdxRef.current = idx;
      onChange(options[idx].value);
      setDragLeftPct(null);
    },
    [n, onChange, options]
  );

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    hitRef.current?.setPointerCapture(e.pointerId);
    setDragging(true);
    setThumbFromClientX(e.clientX);
    const el = trackRef.current;
    if (el) {
      const idx = snapIndex(e.clientX, el.getBoundingClientRect(), n);
      lastSnapIdxRef.current = idx;
      onChange(options[idx].value);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setThumbFromClientX(e.clientX);
    const el = trackRef.current;
    if (!el) return;
    const idx = snapIndex(e.clientX, el.getBoundingClientRect(), n);
    if (idx !== lastSnapIdxRef.current) {
      lastSnapIdxRef.current = idx;
      onChange(options[idx].value);
    }
  };

  const endDrag = useCallback(
    (clientX: number) => {
      setDragging(false);
      commitSnap(clientX);
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

  return (
    <GlassPanel radius={22} isolate={false} style={{ width: '100%', maxWidth: 'min(92vw, 860px)' }}>
      <div
        ref={trackRef}
        style={{
          position: 'relative',
          minHeight: 48,
          padding: 6
        }}
      >
        {/* Labels — uniform; glass thumb provides the “selected” read */}
        <div
          style={{
            position: 'absolute',
            inset: 6,
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
                flex: 1,
                minWidth: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 'clamp(7px, 1.05vw, 10px)',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'rgba(255,255,255,0.78)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                padding: '0 4px',
                textAlign: 'center'
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>

        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 6,
            bottom: 6,
            left: `${thumbLeftPct}%`,
            width: `${thumbWidthPct}%`,
            zIndex: 2,
            pointerEvents: 'none',
            transition: dragging ? 'none' : 'left 0.45s cubic-bezier(0.22, 1, 0.36, 1)'
          }}
        >
          <div style={{ width: '100%', height: '100%', minHeight: 36, position: 'relative', borderRadius: 16, overflow: 'hidden' }}>
            <LiquidGlass
              mouseContainer={trackRef}
              mode="prominent"
              displacementScale={210}
              blurAmount={0.12}
              saturation={185}
              aberrationIntensity={9}
              elasticity={0.34}
              cornerRadius={16}
              padding="0"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                minHeight: 36
              }}
            >
              <div style={{ width: '100%', minHeight: 36 }} aria-hidden />
            </LiquidGlass>
            <div
              aria-hidden
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                borderRadius: 16,
                zIndex: 2,
                background:
                  'linear-gradient(155deg, rgba(0,229,200,0.42) 0%, rgba(0,90,70,0.06) 42%, rgba(0,229,200,0.28) 100%)',
                mixBlendMode: 'screen',
                opacity: 0.55
              }}
            />
            <div
              aria-hidden
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                borderRadius: 16,
                zIndex: 3,
                boxShadow: 'inset 0 0 28px rgba(0,229,200,0.5), inset 0 0 2px rgba(255,255,255,0.12)'
              }}
            />
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
            inset: 6,
            zIndex: 3,
            cursor: dragging ? 'grabbing' : 'grab',
            touchAction: 'none',
            userSelect: 'none'
          }}
        />
      </div>
    </GlassPanel>
  );
}
