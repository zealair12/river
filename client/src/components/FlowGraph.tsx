import { useEffect, useRef, useMemo } from 'react';

interface FlowNode {
  id: string;
  name: string;
  type: string;
  isCurrent?: boolean;
}

interface FlowEdge {
  fromId: string;
  toId: string;
  type: string;
  amount?: number;
  date?: string;
}

interface FlowGraphProps {
  nodes: FlowNode[];
  edges: FlowEdge[];
  currentEntityId: string;
  onNodeClick: (id: string) => void;
}

const TYPE_COLORS: Record<string, string> = {
  company: '#34D399', nonprofit: '#67E8F9', person: '#60A5FA',
  pac: '#F59E0B', wallet: '#A78BFA', shell_company: '#FF4D6A',
  search_cluster: '#475569'
};

interface SimNode extends FlowNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export default function FlowGraph({ nodes, edges, currentEntityId, onNodeClick }: FlowGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const simNodes = useRef<SimNode[]>([]);
  const hoveredNode = useRef<string | null>(null);
  const dragNode = useRef<SimNode | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  const W = 800;
  const H = 450;

  const filteredNodes = useMemo(
    () => nodes.filter((n) => n.type !== 'search_cluster'),
    [nodes]
  );
  const filteredEdges = useMemo(
    () => edges.filter((e) => {
      const types = new Map(nodes.map((n) => [n.id, n.type]));
      return types.get(e.fromId) !== 'search_cluster' && types.get(e.toId) !== 'search_cluster';
    }),
    [edges, nodes]
  );

  useEffect(() => {
    const cx = W / 2;
    const cy = H / 2;
    simNodes.current = filteredNodes.map((n, i) => {
      const angle = (2 * Math.PI * i) / filteredNodes.length;
      const r = n.id === currentEntityId ? 0 : 120 + Math.random() * 60;
      return {
        ...n,
        isCurrent: n.id === currentEntityId,
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        vx: 0,
        vy: 0,
        radius: n.id === currentEntityId ? 24 : 14
      };
    });
  }, [filteredNodes, currentEntityId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const nodeMap = () => new Map(simNodes.current.map((n) => [n.id, n]));

    function tick() {
      const sn = simNodes.current;
      const cx = W / 2;
      const cy = H / 2;

      for (const n of sn) {
        if (dragNode.current?.id === n.id) continue;

        let fx = 0, fy = 0;

        const dx0 = cx - n.x;
        const dy0 = cy - n.y;
        fx += dx0 * 0.0005;
        fy += dy0 * 0.0005;

        for (const o of sn) {
          if (o.id === n.id) continue;
          const dx = n.x - o.x;
          const dy = n.y - o.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const repulse = 3000 / (dist * dist);
          fx += (dx / dist) * repulse;
          fy += (dy / dist) * repulse;
        }

        const nm = nodeMap();
        for (const e of filteredEdges) {
          const a = nm.get(e.fromId);
          const b = nm.get(e.toId);
          if (!a || !b) continue;
          if (a.id !== n.id && b.id !== n.id) continue;
          const other = a.id === n.id ? b : a;
          const dx = other.x - n.x;
          const dy = other.y - n.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const target = 100;
          const spring = (dist - target) * 0.004;
          fx += (dx / dist) * spring;
          fy += (dy / dist) * spring;
        }

        n.vx = (n.vx + fx) * 0.85;
        n.vy = (n.vy + fy) * 0.85;
        n.x += n.vx;
        n.y += n.vy;
        n.x = Math.max(n.radius, Math.min(W - n.radius, n.x));
        n.y = Math.max(n.radius, Math.min(H - n.radius, n.y));
      }
    }

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);

      const nm = nodeMap();

      for (const e of filteredEdges) {
        const a = nm.get(e.fromId);
        const b = nm.get(e.toId);
        if (!a || !b) continue;

        const isDonation = e.type === 'DONATED_TO';
        const color = isDonation ? 'rgba(0,229,200,0.5)' : 'rgba(255,255,255,0.1)';
        const width = isDonation ? Math.min(4, 1 + Math.log10((e.amount ?? 1) + 1) * 0.6) : 1;

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.stroke();

        if (isDonation) {
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2;
          const angle = Math.atan2(b.y - a.y, b.x - a.x);
          const arrowSize = 6;
          ctx.beginPath();
          ctx.moveTo(mx + Math.cos(angle) * arrowSize, my + Math.sin(angle) * arrowSize);
          ctx.lineTo(mx + Math.cos(angle + 2.5) * arrowSize, my + Math.sin(angle + 2.5) * arrowSize);
          ctx.lineTo(mx + Math.cos(angle - 2.5) * arrowSize, my + Math.sin(angle - 2.5) * arrowSize);
          ctx.closePath();
          ctx.fillStyle = 'rgba(0,229,200,0.7)';
          ctx.fill();
        }

        if (isDonation && e.amount) {
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2 - 8;
          ctx.font = '10px Inter, system-ui, sans-serif';
          ctx.fillStyle = 'rgba(0,229,200,0.8)';
          ctx.textAlign = 'center';
          ctx.fillText(`$${e.amount.toLocaleString()}`, mx, my);
        }
      }

      for (const n of simNodes.current) {
        const col = TYPE_COLORS[n.type] ?? '#94a3b8';
        const isHovered = hoveredNode.current === n.id;

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius + (isHovered ? 3 : 0), 0, Math.PI * 2);
        ctx.fillStyle = n.isCurrent ? col : `${col}44`;
        ctx.fill();
        ctx.strokeStyle = col;
        ctx.lineWidth = n.isCurrent ? 3 : 1.5;
        ctx.stroke();

        ctx.font = `${n.isCurrent ? '12' : '10'}px Inter, system-ui, sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.textAlign = 'center';
        const label = n.name.length > 18 ? n.name.slice(0, 16) + '…' : n.name;
        ctx.fillText(label, n.x, n.y + n.radius + 14);
      }
    }

    function loop() {
      tick();
      draw();
      animRef.current = requestAnimationFrame(loop);
    }

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [filteredEdges, currentEntityId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function getNode(mx: number, my: number): SimNode | undefined {
      const rect = canvas!.getBoundingClientRect();
      const sx = W / rect.width;
      const sy = H / rect.height;
      const x = (mx - rect.left) * sx;
      const y = (my - rect.top) * sy;
      return simNodes.current.find((n) => {
        const dx = n.x - x;
        const dy = n.y - y;
        return dx * dx + dy * dy <= (n.radius + 4) * (n.radius + 4);
      });
    }

    function onMove(e: MouseEvent) {
      if (dragNode.current) {
        const rect = canvas!.getBoundingClientRect();
        const sx = W / rect.width;
        const sy = H / rect.height;
        dragNode.current.x = (e.clientX - rect.left) * sx - dragOffset.current.x;
        dragNode.current.y = (e.clientY - rect.top) * sy - dragOffset.current.y;
        dragNode.current.vx = 0;
        dragNode.current.vy = 0;
        return;
      }
      const n = getNode(e.clientX, e.clientY);
      hoveredNode.current = n?.id ?? null;
      canvas!.style.cursor = n ? 'pointer' : 'grab';
    }

    function onDown(e: MouseEvent) {
      const n = getNode(e.clientX, e.clientY);
      if (n) {
        const rect = canvas!.getBoundingClientRect();
        const sx = W / rect.width;
        const sy = H / rect.height;
        dragNode.current = n;
        dragOffset.current = {
          x: (e.clientX - rect.left) * sx - n.x,
          y: (e.clientY - rect.top) * sy - n.y
        };
        canvas!.style.cursor = 'grabbing';
      }
    }

    function onUp(e: MouseEvent) {
      if (dragNode.current) {
        const moved = Math.abs(dragOffset.current.x) > 3 || Math.abs(dragOffset.current.y) > 3;
        const n = dragNode.current;
        dragNode.current = null;
        if (!moved) {
          onNodeClick(n.id);
        }
        return;
      }
      const n = getNode(e.clientX, e.clientY);
      if (n) onNodeClick(n.id);
    }

    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mouseup', onUp);
    return () => {
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mousedown', onDown);
      canvas.removeEventListener('mouseup', onUp);
    };
  }, [onNodeClick]);

  if (filteredNodes.length < 2) return null;

  return (
    <div style={{
      marginTop: 24, padding: 20, borderRadius: 16,
      background: 'var(--glass-bg)', border: '1px solid var(--glass-border)'
    }}>
      <h2 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 400, opacity: 0.7 }}>
        Money Flow Graph
      </h2>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{
          width: '100%',
          height: 'auto',
          borderRadius: 12,
          background: 'rgba(0,0,0,0.2)',
          cursor: 'grab'
        }}
      />
      <div style={{ fontSize: 11, opacity: 0.3, marginTop: 8 }}>
        Drag nodes to rearrange · Click to navigate · Arrows show money direction
      </div>
    </div>
  );
}
