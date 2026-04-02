import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { useNavigate } from 'react-router-dom';
import { feature } from 'topojson-client';
import worldTopo from 'world-atlas/countries-110m.json';
import {
  DATA_POINTS, CONNECTIONS, CATEGORY_LABELS,
  isFlowVisibleForCategoryFilter,
  project, type DataPoint
} from './worldMapData';
import { GlassPanel } from './GlassPanel';
import { CategorySnapSlider, type CategoryFilter } from './CategorySnapSlider';

const SCENE_W = 1000;
const SCENE_H = 500;
const DOT_COLOR = '#00E5C8';

const worldGeo = feature(worldTopo as any, (worldTopo as any).objects.countries) as any;

const DOT_VERTEX = `
  attribute float size;
  attribute float aAlpha;
  varying float vAlpha;
  void main() {
    vAlpha = aAlpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (500.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const DOT_FRAGMENT = `
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float core = smoothstep(0.5, 0.0, d);
    float glow = smoothstep(0.5, 0.1, d) * 0.6;
    float a = (core + glow) * vAlpha;
    gl_FragColor = vec4(0.0, 0.9, 0.78, a);
  }
`;

const ARC_VERTEX = `
  attribute float aProgress;
  uniform float uTime;
  uniform float uIntro;
  varying float vArcAlpha;
  void main() {
    float visible = step(aProgress, uIntro);
    float pulse = 0.5 + 0.5 * sin(uTime * 2.0 - aProgress * 6.28);
    vArcAlpha = visible * mix(0.08, 0.28, pulse);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ARC_FRAGMENT = `
  varying float vArcAlpha;
  void main() {
    gl_FragColor = vec4(0.0, 0.9, 0.78, vArcAlpha);
  }
`;

interface TooltipState { x: number; y: number; point: DataPoint }
interface LiveNews { title: string; source: string }

const CATEGORIES = [...new Set(DATA_POINTS.map((d) => d.category))];
const DP_BY_ID = new Map(DATA_POINTS.map((d) => [d.id, d]));

export default function WorldMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [animCount, setAnimCount] = useState(0);
  const [introComplete, setIntroComplete] = useState(false);
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>(null);
  const [hoverNews, setHoverNews] = useState<LiveNews[]>([]);
  const clickRef = useRef<DataPoint | null>(null);
  const filterRef = useRef<CategoryFilter>(null);
  const newsCacheRef = useRef<Map<string, LiveNews[]>>(new Map());

  useEffect(() => { filterRef.current = activeFilter; }, [activeFilter]);

  const sliderOptions = useMemo(
    () => [
      { value: null as CategoryFilter, label: 'All' },
      ...CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABELS[c] ?? c }))
    ],
    []
  );

  const filteredVolume = useMemo(() => {
    const pts = activeFilter === null
      ? DATA_POINTS
      : DATA_POINTS.filter((d) => d.category === activeFilter);
    return pts.reduce((s, d) => s + d.metricValue, 0);
  }, [activeFilter]);

  const filteredFlowCount = useMemo(
    () => CONNECTIONS.filter(([fromId, toId]) =>
      isFlowVisibleForCategoryFilter(fromId, toId, activeFilter)
    ).length,
    [activeFilter]
  );

  const fetchLiveNews = useCallback((dp: DataPoint) => {
    const cached = newsCacheRef.current.get(dp.id);
    if (cached) { setHoverNews(cached); return; }
    const q = dp.ticker ?? dp.city;
    fetch(`/api/market/news?q=${encodeURIComponent(q)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const articles: LiveNews[] = (d?.articles ?? [])
          .slice(0, 3)
          .map((a: { title?: string; source?: string }) => ({ title: a.title ?? '', source: a.source ?? '' }));
        if (articles.length > 0) {
          newsCacheRef.current.set(dp.id, articles);
          setHoverNews(articles);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const aspect = container.clientWidth / container.clientHeight;
    const viewH = SCENE_H * 1.15;
    const viewW = viewH * aspect;
    const camera = new THREE.OrthographicCamera(-viewW / 2, viewW / 2, viewH / 2, -viewH / 2, 0.1, 1000);
    camera.position.set(0, 0, 100);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(new THREE.Color('#060f0b'), 1);
    container.appendChild(renderer.domElement);

    const mapGroup = new THREE.Group();
    (worldGeo.features ?? []).forEach((f: any) => {
      const rings: number[][][] = [];
      if (f.geometry.type === 'Polygon') {
        rings.push(...f.geometry.coordinates);
      } else if (f.geometry.type === 'MultiPolygon') {
        f.geometry.coordinates.forEach((p: number[][][]) => rings.push(...p));
      }
      rings.forEach((ring: number[][]) => {
        const segments: THREE.Vector3[][] = [[]];
        for (let i = 0; i < ring.length; i++) {
          const [lon, lat] = ring[i];
          if (i > 0 && Math.abs(lon - ring[i - 1][0]) > 90) segments.push([]);
          const [x, y] = project(lon, lat, SCENE_W, SCENE_H);
          segments[segments.length - 1].push(new THREE.Vector3(x, y, 0));
        }
        segments.forEach((pts) => {
          if (pts.length < 2) return;
          const geo = new THREE.BufferGeometry().setFromPoints(pts);
          const mat = new THREE.LineBasicMaterial({ color: 0x1a8a6a, transparent: true, opacity: 0 });
          mapGroup.add(new THREE.Line(geo, mat));
        });
      });
    });
    scene.add(mapGroup);

    const positions: number[] = [];
    const sizes: number[] = [];
    const alphas: number[] = [];
    DATA_POINTS.forEach((dp) => {
      const [x, y] = project(dp.lon, dp.lat, SCENE_W, SCENE_H);
      positions.push(x, y, 1);
      sizes.push(Math.max(5, Math.min(22, 5 + dp.metricValue * 0.8)));
      alphas.push(0);
    });

    const dotGeo = new THREE.BufferGeometry();
    dotGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    dotGeo.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
    dotGeo.setAttribute('aAlpha', new THREE.Float32BufferAttribute(alphas, 1));

    const dotMat = new THREE.ShaderMaterial({
      vertexShader: DOT_VERTEX,
      fragmentShader: DOT_FRAGMENT,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    const dotMesh = new THREE.Points(dotGeo, dotMat);
    scene.add(dotMesh);

    const arcGroup = new THREE.Group();
    const arcUniforms = { uTime: { value: 0 }, uIntro: { value: 0 } };
    const arcLines: { line: THREE.Line; fromId: string; toId: string }[] = [];

    CONNECTIONS.forEach(([fromId, toId]) => {
      const a = DP_BY_ID.get(fromId);
      const b = DP_BY_ID.get(toId);
      if (!a || !b) return;
      const [ax, ay] = project(a.lon, a.lat, SCENE_W, SCENE_H);
      const [bx, by] = project(b.lon, b.lat, SCENE_W, SCENE_H);
      const dx = bx - ax, dy = by - ay;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1) return;
      const nx = -dy / dist, ny = dx / dist;
      const cx = (ax + bx) / 2 + nx * dist * 0.15;
      const cy = (ay + by) / 2 + ny * dist * 0.15;

      const pts: number[] = [], prog: number[] = [];
      for (let i = 0; i <= 40; i++) {
        const t = i / 40;
        pts.push(
          (1 - t) * (1 - t) * ax + 2 * (1 - t) * t * cx + t * t * bx,
          (1 - t) * (1 - t) * ay + 2 * (1 - t) * t * cy + t * t * by,
          0.5
        );
        prog.push(t);
      }
      const arcGeo = new THREE.BufferGeometry();
      arcGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      arcGeo.setAttribute('aProgress', new THREE.Float32BufferAttribute(prog, 1));
      const line = new THREE.Line(arcGeo, new THREE.ShaderMaterial({
        vertexShader: ARC_VERTEX, fragmentShader: ARC_FRAGMENT,
        uniforms: arcUniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
      }));
      arcGroup.add(line);
      arcLines.push({ line, fromId, toId });
    });
    scene.add(arcGroup);

    const raycaster = new THREE.Raycaster();
    raycaster.params.Points = { threshold: 8 };
    const mouse = new THREE.Vector2(9999, 9999);
    let hoveredIdx = -1;
    let lastHoveredId = '';

    function onMouseMove(e: MouseEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(dotMesh);
      if (intersects.length > 0) {
        const idx = intersects[0].index!;
        const dp = DATA_POINTS[idx];
        const f = filterRef.current;
        if (f !== null && dp.category !== f) {
          hoveredIdx = -1;
          clickRef.current = null;
          lastHoveredId = '';
          renderer.domElement.style.cursor = 'default';
          setTooltip(null);
          setHoverNews([]);
          return;
        }
        hoveredIdx = idx;
        clickRef.current = dp;
        renderer.domElement.style.cursor = 'pointer';
        setTooltip({ x: e.clientX, y: e.clientY, point: dp });
        if (dp.id !== lastHoveredId) {
          lastHoveredId = dp.id;
          setHoverNews([]);
          fetchLiveNews(dp);
        }
      } else {
        hoveredIdx = -1;
        clickRef.current = null;
        lastHoveredId = '';
        renderer.domElement.style.cursor = 'default';
        setTooltip(null);
        setHoverNews([]);
      }
    }

    function onMouseClick() {
      const p = clickRef.current;
      if (p?.route) navigate(p.route);
    }

    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('click', onMouseClick);

    const time0 = performance.now();
    let introProgress = 0;
    let currentCount = 0;
    let introNotified = false;

    function animate() {
      const elapsed = (performance.now() - time0) / 1000;
      introProgress = Math.min(1, elapsed / 3.0);

      mapGroup.children.forEach((child) => {
        const mat = (child as THREE.Line).material as THREE.LineBasicMaterial;
        mat.opacity = Math.min(0.55, introProgress * 0.7);
      });

      const currentFilter = filterRef.current;
      arcLines.forEach(({ line, fromId, toId }) => {
        line.visible = isFlowVisibleForCategoryFilter(fromId, toId, currentFilter);
      });

      const alphaAttr = dotGeo.getAttribute('aAlpha') as THREE.BufferAttribute;
      const sizeAttr = dotGeo.getAttribute('size') as THREE.BufferAttribute;
      let visibleCount = 0;

      for (let i = 0; i < DATA_POINTS.length; i++) {
        const dp = DATA_POINTS[i];
        const visible = currentFilter === null || dp.category === currentFilter;
        const threshold = (i / DATA_POINTS.length) * 0.8;
        let targetAlpha = visible && introProgress > threshold ? 1 : 0;

        if (targetAlpha > 0) {
          const fadeIn = Math.min(1, (introProgress - threshold) / 0.15);
          const pulse = 0.85 + 0.15 * Math.sin(elapsed * 1.5 + i * 0.5);
          targetAlpha = fadeIn * pulse;
          visibleCount++;
        }

        const isHovered = hoveredIdx === i;
        const baseMag = Math.max(5, Math.min(22, 5 + dp.metricValue * 0.8));
        sizeAttr.setX(i, baseMag * (isHovered ? 2.0 : 1) * (visible ? 1 : 0));
        alphaAttr.setX(i, targetAlpha);
      }
      alphaAttr.needsUpdate = true;
      sizeAttr.needsUpdate = true;

      if (visibleCount !== currentCount) {
        currentCount = visibleCount;
        setAnimCount(visibleCount);
      }
      if (introProgress >= 1 && !introNotified) {
        introNotified = true;
        setIntroComplete(true);
      }

      arcUniforms.uTime.value = elapsed;
      arcUniforms.uIntro.value = Math.max(0, (introProgress - 0.3) / 0.7);
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }

    const animId = requestAnimationFrame(animate);

    function onResize() {
      if (!container) return;
      const w = container.clientWidth, h = container.clientHeight;
      const a = w / h, vh = SCENE_H * 1.15, vw = vh * a;
      camera.left = -vw / 2; camera.right = vw / 2;
      camera.top = vh / 2; camera.bottom = -vh / 2;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('click', onMouseClick);
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [navigate, fetchLiveNews]);

  const displayNews = hoverNews.length > 0
    ? hoverNews.map((n) => n.title)
    : tooltip?.point.news ?? [];

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden', background: '#060f0b' }}>
      {/* WebGL — lowest layer */}
      <div ref={mountRef} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />

      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
        background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(4,8,6,0.7) 100%)'
      }} />

      {/* Top chrome — CSS grid: logo | slider | stats (no overlap, no LiquidGlass transform bugs) */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 30,
          display: 'grid',
          gridTemplateColumns: 'minmax(min-content, auto) minmax(0, 1fr) minmax(min-content, auto)',
          alignItems: 'start',
          gap: 'clamp(8px, 2vw, 16px)',
          padding: 'clamp(12px, 2vh, 20px) clamp(12px, 2.5vw, 28px)',
          pointerEvents: 'none'
        }}
      >
        <div style={{ pointerEvents: 'auto', justifySelf: 'start', minWidth: 0 }}>
          <GlassPanel radius={14} style={{ padding: '10px 18px' }}>
            <span style={{
              fontSize: 'clamp(18px, 2.2vw, 24px)', fontWeight: 300,
              letterSpacing: '0.28em', color: 'rgba(255,255,255,0.92)',
              whiteSpace: 'nowrap', display: 'block'
            }}>
              riVer
            </span>
          </GlassPanel>
        </div>

        <div style={{ pointerEvents: 'auto', justifySelf: 'center', width: '100%', minWidth: 0, display: 'flex', justifyContent: 'center' }}>
          <CategorySnapSlider
            options={sliderOptions}
            value={activeFilter}
            onChange={setActiveFilter}
          />
        </div>

        <div style={{ pointerEvents: 'auto', justifySelf: 'end', minWidth: 0 }}>
          <GlassPanel radius={16} style={{ padding: '10px 14px' }}>
            <div style={{ display: 'flex', gap: 'clamp(8px, 1.2vw, 16px)', alignItems: 'flex-end' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: 2 }}>Points</div>
                <div style={{ fontSize: 'clamp(18px, 2vw, 24px)', fontWeight: 200, fontFamily: 'Georgia, serif', color: 'rgba(255,255,255,0.9)', lineHeight: 1 }}>{animCount}</div>
              </div>
              <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.08)' }} />
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: 2 }}>Volume</div>
                <div style={{ fontSize: 'clamp(18px, 2vw, 24px)', fontWeight: 200, fontFamily: 'Georgia, serif', color: 'rgba(255,255,255,0.85)', lineHeight: 1 }}>${filteredVolume.toFixed(1)}T</div>
              </div>
              <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.08)' }} />
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: 2 }}>Flows</div>
                <div style={{ fontSize: 'clamp(18px, 2vw, 24px)', fontWeight: 200, fontFamily: 'Georgia, serif', color: 'rgba(0,229,200,0.85)', lineHeight: 1 }}>{filteredFlowCount}</div>
              </div>
            </div>
          </GlassPanel>
        </div>
      </div>

      <div style={{
        position: 'absolute',
        bottom: 'clamp(12px, 2vh, 20px)',
        right: 'clamp(16px, 3vw, 32px)',
        zIndex: 20,
        fontSize: 9,
        color: 'rgba(255,255,255,0.2)',
        letterSpacing: '0.08em',
        textTransform: 'uppercase'
      }}>
        {introComplete
          ? `${filteredFlowCount} money flows${activeFilter ? ' (filtered)' : ' tracked'}`
          : 'Mapping global finance...'}
      </div>

      {tooltip && (
        <div style={{
          position: 'fixed',
          left: Math.min(tooltip.x + 16, window.innerWidth - 340),
          top: Math.max(10, tooltip.y - 10),
          zIndex: 400,
          pointerEvents: 'none',
          maxWidth: 320
        }}>
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 16, overflow: 'hidden', pointerEvents: 'none',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.03) 100%)',
            zIndex: 1
          }} />
          <div style={{
            position: 'relative',
            background: 'rgba(6, 15, 11, 0.82)',
            backdropFilter: 'blur(24px) saturate(1.5)',
            WebkitBackdropFilter: 'blur(24px) saturate(1.5)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderTop: '1px solid rgba(255,255,255,0.18)',
            borderRadius: 16,
            padding: '16px 20px',
            boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 30px rgba(0,229,200,0.06), inset 0 1px 0 rgba(255,255,255,0.06)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: DOT_COLOR, boxShadow: `0 0 10px ${DOT_COLOR}` }} />
              <span style={{ fontSize: 15, fontWeight: 500, color: 'rgba(255,255,255,0.95)' }}>{tooltip.point.city}</span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>{tooltip.point.country}</span>
            </div>
            <div style={{ fontSize: 30, fontWeight: 200, fontFamily: 'Georgia, serif', color: DOT_COLOR, marginBottom: 8, lineHeight: 1 }}>
              {tooltip.point.metric}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4, marginBottom: 10 }}>
              {tooltip.point.headline}
            </div>
            {displayNews.length > 0 && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8 }}>
                <div style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.2)', marginBottom: 4 }}>
                  {hoverNews.length > 0 ? 'Live Headlines' : 'Recent'}
                </div>
                {displayNews.map((n, i) => (
                  <div key={i} style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, display: 'flex', gap: 6 }}>
                    <span style={{ color: DOT_COLOR, opacity: 0.6, flexShrink: 0 }}>▸</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>{n}</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.15)', marginTop: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {CATEGORY_LABELS[tooltip.point.category]}
              {tooltip.point.ticker && ` · ${tooltip.point.ticker}`}
              {tooltip.point.route && ' · Click to explore'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
