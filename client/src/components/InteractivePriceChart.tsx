import { useCallback, useMemo, useRef, useState } from 'react';

export interface CandleSeries {
  timestamps: number[];
  closes: number[];
  volumes: number[];
}

const W = 720;
const H = 280;
const PAD_L = 64;
const PAD_R = 20;
const PAD_T = 18;
const PAD_B = 36;

export function InteractivePriceChart({ candles }: { candles: CandleSeries }) {
  const { timestamps, closes, volumes } = candles;
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<{ i: number; px: number; py: number } | null>(null);

  const { minV, rng, step, points, areaPoints, yLines, xLabels } = useMemo(() => {
    if (closes.length < 2) {
      return {
        minV: 0,
        rng: 1,
        step: 1,
        points: [] as string[],
        areaPoints: '',
        yLines: [] as { y: number; label: string }[],
        xLabels: [] as { x: number; label: string }[]
      };
    }
    const lo = Math.min(...closes);
    const hi = Math.max(...closes);
    const rng = hi - lo || 1;
    const cw = W - PAD_L - PAD_R;
    const ch = H - PAD_T - PAD_B;
    const st = cw / (closes.length - 1);
    const pts = closes.map((v, i) => {
      const x = PAD_L + i * st;
      const y = PAD_T + ch - ((v - lo) / rng) * ch;
      return `${x},${y}`;
    });
    const area = [`${PAD_L},${PAD_T + ch}`, ...pts, `${PAD_L + (closes.length - 1) * st},${PAD_T + ch}`].join(' ');
    const yTicks = 5;
    const yL = Array.from({ length: yTicks }, (_, i) => {
      const val = lo + (rng * i) / (yTicks - 1);
      const y = PAD_T + ch - ((val - lo) / rng) * ch;
      return { y, label: `$${val.toFixed(val < 10 ? 2 : 0)}` };
    });
    const labelInterval = Math.max(1, Math.floor(timestamps.length / 6));
    const xL: { x: number; label: string }[] = [];
    for (let i = 0; i < timestamps.length; i += labelInterval) {
      const d = new Date(timestamps[i] * 1000);
      xL.push({
        x: PAD_L + i * st,
        label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: timestamps.length > 200 ? undefined : 'numeric', minute: timestamps.length > 200 ? undefined : 'numeric' })
      });
    }
    return {
      minV: lo,
      rng,
      step: st,
      points: pts,
      areaPoints: area,
      yLines: yL,
      xLabels: xL
    };
  }, [closes, timestamps]);

  const positive = closes.length >= 2 && closes[closes.length - 1] >= closes[0];
  const lineColor = positive ? '#86efac' : '#fca5a5';
  const fillColor = positive ? 'rgba(134,239,172,0.08)' : 'rgba(252,165,165,0.08)';

  const onMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!svgRef.current || closes.length < 2) return;
      const rect = svgRef.current.getBoundingClientRect();
      const vx = ((e.clientX - rect.left) / rect.width) * W;
      const cw = W - PAD_L - PAD_R;
      const st = cw / (closes.length - 1);
      let i = Math.round((vx - PAD_L) / st);
      i = Math.max(0, Math.min(closes.length - 1, i));
      const ch = H - PAD_T - PAD_B;
      const y = PAD_T + ch - ((closes[i] - minV) / rng) * ch;
      const x = PAD_L + i * st;
      setHover({ i, px: x, py: y });
    },
    [closes, minV, rng]
  );

  const onLeave = useCallback(() => setHover(null), []);

  if (closes.length < 2) return null;

  const hi = hover?.i;
  const volAt = hi != null ? volumes[hi] : null;

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg
        ref={svgRef}
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: 'block', cursor: 'crosshair' }}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
      >
        {yLines.map((yl) => (
          <g key={yl.y}>
            <line x1={PAD_L} y1={yl.y} x2={W - PAD_R} y2={yl.y} stroke="rgba(255,255,255,0.06)" />
            <text x={PAD_L - 8} y={yl.y + 4} textAnchor="end" fill="rgba(255,255,255,0.35)" fontSize={10}>
              {yl.label}
            </text>
          </g>
        ))}
      {xLabels.map((xl, xi) => (
        <text key={`${xl.x}-${xi}`} x={xl.x} y={H - 8} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize={9}>
          {xl.label}
        </text>
      ))}
        <polygon points={areaPoints} fill={fillColor} />
        <polyline points={points.join(' ')} fill="none" stroke={lineColor} strokeWidth={2} />
        {hover && (
          <g>
            <line
              x1={hover.px}
              y1={PAD_T}
              x2={hover.px}
              y2={PAD_T + (H - PAD_T - PAD_B)}
              stroke="rgba(0,229,200,0.45)"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
            <circle cx={hover.px} cy={hover.py} r={5} fill={lineColor} stroke="rgba(255,255,255,0.5)" strokeWidth={1} />
          </g>
        )}
      </svg>
      {hover && hi != null && (
        <div
          style={{
            position: 'absolute',
            left: `clamp(8px, ${(hover.px / W) * 100}%, calc(100% - 200px))`,
            top: 8,
            padding: '8px 12px',
            borderRadius: 10,
            background: 'rgba(6, 15, 11, 0.92)',
            border: '1px solid rgba(0,229,200,0.25)',
            fontSize: 12,
            lineHeight: 1.45,
            pointerEvents: 'none',
            maxWidth: 220,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
          }}
        >
          <div style={{ opacity: 0.45, fontSize: 10, marginBottom: 4 }}>
            {new Date(timestamps[hi] * 1000).toLocaleString()}
          </div>
          <div style={{ fontWeight: 600 }}>Close {closes[hi].toFixed(2)}</div>
          {volAt != null && volAt > 0 && (
            <div style={{ opacity: 0.65, marginTop: 4 }}>Vol {volAt.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          )}
        </div>
      )}
    </div>
  );
}
