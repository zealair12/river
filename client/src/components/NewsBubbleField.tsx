import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { OrbitNewsItem } from './NewsOrbitRow';
import { faviconForArticleUrl } from './NewsOrbitRow';

type Ball = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  item: OrbitNewsItem;
};

function thumbUrl(item: OrbitNewsItem): { src: string; fb: string } {
  const fb = faviconForArticleUrl(item.url);
  if (item.imageUrl && /^https?:\/\//i.test(item.imageUrl.trim())) {
    let u = item.imageUrl.trim();
    if (u.startsWith('//')) u = `https:${u}`;
    return { src: u, fb };
  }
  return { src: fb, fb };
}

function initBalls(items: OrbitNewsItem[], w: number, h: number): Ball[] {
  const n = items.length;
  if (n === 0 || w < 32 || h < 32) return [];
  const area = w * h;
  const baseR = Math.min(96, Math.max(48, Math.sqrt(area / (n * Math.PI * 1.1))));
  const balls: Ball[] = [];
  for (let i = 0; i < n; i++) {
    const item = items[i];
    const r = baseR * (0.88 + (i % 5) * 0.025);
    let x = r + 1;
    let y = r + 1;
    let ok = false;
    for (let t = 0; t < 120 && !ok; t++) {
      x = r + Math.random() * Math.max(1, w - 2 * r);
      y = r + Math.random() * Math.max(1, h - 2 * r);
      ok = !balls.some((b) => Math.hypot(b.x - x, b.y - y) < b.r + r + 2);
    }
    const ang = Math.random() * Math.PI * 2;
    const spd = 40 + Math.random() * 50;
    balls.push({ x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, r, item });
  }
  return balls;
}

function runStep(balls: Ball[], w: number, h: number, dt: number) {
  const d = Math.max(0, Math.min(0.05, dt));
  for (const b of balls) {
    b.x += b.vx * d;
    b.y += b.vy * d;
    if (b.x < b.r) {
      b.x = b.r;
      b.vx *= -1;
    }
    if (b.x > w - b.r) {
      b.x = w - b.r;
      b.vx *= -1;
    }
    if (b.y < b.r) {
      b.y = b.r;
      b.vy *= -1;
    }
    if (b.y > h - b.r) {
      b.y = h - b.r;
      b.vy *= -1;
    }
  }
  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      const a = balls[i];
      const b = balls[j];
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let dist = Math.hypot(dx, dy);
      const minD = a.r + b.r;
      if (dist < 0.001) {
        dx = 0.001;
        dist = 0.001;
      }
      if (dist < minD) {
        const overlap = (minD - dist) * 0.52;
        const nx = dx / dist;
        const ny = dy / dist;
        a.x -= nx * overlap;
        a.y -= ny * overlap;
        b.x += nx * overlap;
        b.y += ny * overlap;
        dx = b.x - a.x;
        dy = b.y - a.y;
        dist = Math.hypot(dx, dy) || 0.001;
        const dvx = b.vx - a.vx;
        const dvy = b.vy - a.vy;
        const dvn = (dvx * dx + dvy * dy) / dist;
        if (dvn < 0) {
          const nx2 = dx / dist;
          const ny2 = dy / dist;
          const jn = -dvn;
          a.vx -= jn * nx2;
          a.vy -= jn * ny2;
          b.vx += jn * nx2;
          b.vy += jn * ny2;
        }
      }
    }
  }
}

export function NewsBubbleField({ items }: { items: OrbitNewsItem[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const ballsRef = useRef<Ball[]>([]);
  const lastTsRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [, setTick] = useState(0);
  const bump = useCallback(() => setTick((t) => (t + 1) % 1_000_000), []);

  const slice = items.slice(0, 18);
  const itemsKey = slice.map((i) => i.url).join('\n');

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const applySize = () => {
      const r = el.getBoundingClientRect();
      const w = Math.max(0, r.width);
      const h = Math.max(0, r.height);
      setDims({ w, h });
      ballsRef.current = initBalls(items.slice(0, 18), w, h);
      lastTsRef.current = null;
    };
    const ro = new ResizeObserver(applySize);
    ro.observe(el);
    applySize();
    return () => ro.disconnect();
  }, [itemsKey]);

  useEffect(() => {
    if (slice.length === 0 || dims.w < 32 || dims.h < 32) return;
    const loop = (ts: number) => {
      const last = lastTsRef.current ?? ts;
      lastTsRef.current = ts;
      const dt = (ts - last) / 1000;
      runStep(ballsRef.current, dims.w, dims.h, dt);
      bump();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [slice.length, dims.w, dims.h, bump, itemsKey]);

  if (slice.length === 0) return null;

  const balls = ballsRef.current;

  return (
    <div
      ref={wrapRef}
      className="news-bubble-field"
      style={{
        position: 'relative',
        width: '100%',
        minHeight: 'min(52vh, 560px)',
        borderRadius: 16,
        overflow: 'hidden',
        background: 'radial-gradient(ellipse at 30% 20%, rgba(0,229,200,0.06) 0%, transparent 50%), rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)'
      }}
    >
      {balls.map((b, index) => (
        <PhysicsBubble key={b.item.url + index} x={b.x} y={b.y} r={b.r} item={b.item} />
      ))}
    </div>
  );
}

function PhysicsBubble({ x, y, r, item }: { x: number; y: number; r: number; item: OrbitNewsItem }) {
  const { src, fb } = thumbUrl(item);
  const size = r * 2;
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      title={item.title}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        marginLeft: -r,
        marginTop: -r,
        borderRadius: '50%',
        overflow: 'hidden',
        border: '2px solid rgba(0, 229, 200, 0.22)',
        boxShadow: '0 12px 32px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.06)',
        zIndex: 1,
        willChange: 'transform'
      }}
    >
      <img
        src={src}
        alt=""
        style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.42 }}
        onError={(e) => {
          const el = e.target as HTMLImageElement;
          if (el.src !== fb) el.src = fb;
          else el.style.display = 'none';
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
          pointerEvents: 'none',
          padding: 4
        }}
      >
        <span
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 4,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textAlign: 'center',
            fontSize: 10,
            lineHeight: 1.25,
            fontWeight: 500,
            color: 'rgba(255,255,255,0.96)',
            textShadow: '0 1px 4px rgba(0,0,0,0.95)',
            wordBreak: 'break-word',
            maxWidth: '100%'
          }}
        >
          {item.title}
        </span>
      </div>
    </a>
  );
}
