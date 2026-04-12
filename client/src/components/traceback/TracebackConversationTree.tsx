import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import type { MessageResponse } from '@traceback/shared';
import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import Dagre from '@dagrejs/dagre';
import { stripMarkdown } from '../../utils/stripMarkdown';
import { RiverTreeNode } from './RiverTreeNode';

const nodeTypes = { custom: RiverTreeNode };

function layoutTree(nodes: Node[], edges: Edge[]): Node[] {
  if (nodes.length === 0) return nodes;
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 80 });
  nodes.forEach((n) => g.setNode(n.id, { width: 200, height: 50 }));
  edges.forEach((e) => g.setEdge(e.source, e.target));
  Dagre.layout(g);
  return nodes.map((n) => {
    const pos = g.node(n.id);
    return { ...n, position: { x: pos.x - 100, y: pos.y - 25 } };
  });
}

/** Nearest user message id to center the viewport (graph nodes are user turns only). */
export function anchorUserMessageId(
  allMessages: MessageResponse[],
  activeMessageId: string | null
): string | null {
  if (!activeMessageId) return null;
  const messageById = new Map(allMessages.map((m) => [m.id, m]));
  let cur: MessageResponse | undefined = messageById.get(activeMessageId);
  while (cur) {
    if (cur.role === 'user') return cur.id;
    cur = cur.parentId ? messageById.get(cur.parentId) : undefined;
  }
  return null;
}

function buildGraph(
  allMessages: MessageResponse[],
  activeMessageId: string | null
): { nodes: Node[]; edges: Edge[]; activePathIds: Set<string> } {
  const messageById = new Map(allMessages.map((m) => [m.id, m]));

  const threadPath: MessageResponse[] = [];
  if (activeMessageId && allMessages.length > 0) {
    let current: MessageResponse | undefined = messageById.get(activeMessageId);
    while (current) {
      threadPath.unshift(current);
      current = current.parentId ? messageById.get(current.parentId) : undefined;
    }
  }
  const activePathIds = new Set(threadPath.map((m) => m.id));

  const userMessages = allMessages.filter((m) => m.role === 'user');
  const userMessageIds = new Set(userMessages.map((m) => m.id));

  const userParentMap = new Map<string, string | null>();
  for (const m of userMessages) {
    let cur = m.parentId;
    while (cur) {
      if (userMessageIds.has(cur)) {
        userParentMap.set(m.id, cur);
        break;
      }
      const parent = messageById.get(cur);
      cur = parent?.parentId ?? null;
    }
    if (!userParentMap.has(m.id)) userParentMap.set(m.id, null);
  }

  const nodes: Node[] = userMessages.map((m) => {
    const t = stripMarkdown(m.content);
    const d = new Date(m.createdAt);
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return {
      id: m.id,
      type: 'custom',
      data: {
        label: t.length > 40 ? t.slice(0, 40) + '…' : t,
        timestamp: time,
        childCount: userMessages.filter((c) => userParentMap.get(c.id) === m.id).length
      },
      position: { x: 0, y: 0 }
    };
  });

  const edges: Edge[] = userMessages
    .filter((m) => userParentMap.get(m.id))
    .map((m) => ({
      id: `e-${userParentMap.get(m.id)}-${m.id}`,
      source: userParentMap.get(m.id)!,
      target: m.id
    }));

  return { nodes, edges, activePathIds };
}

function TreeFlowInner({
  nodes,
  edges,
  focusUserNodeId,
  onSelectUserNode,
  onDeleteSubtree
}: {
  nodes: Node[];
  edges: Edge[];
  focusUserNodeId: string | null;
  onSelectUserNode: (userMessageId: string) => void;
  onDeleteSubtree?: (userMessageId: string) => void;
}) {
  const reactFlow = useReactFlow();
  const prevFocusRef = useRef<string | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);

  useEffect(() => {
    if (!focusUserNodeId || focusUserNodeId === prevFocusRef.current) return;
    prevFocusRef.current = focusUserNodeId;
    const timer = setTimeout(() => {
      reactFlow.fitView({ nodes: [{ id: focusUserNodeId }], duration: 400, padding: 1.5 });
    }, 80);
    return () => clearTimeout(timer);
  }, [focusUserNodeId, reactFlow]);

  useEffect(() => {
    const close = () => setCtxMenu(null);
    window.addEventListener('click', close);
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });
    return () => {
      window.removeEventListener('click', close);
    };
  }, []);

  const handleNodeClick = useCallback(
    (_: MouseEvent, node: Node) => onSelectUserNode(node.id),
    [onSelectUserNode]
  );

  const handleNodeContextMenu = useCallback(
    (event: MouseEvent, node: Node) => {
      if (!onDeleteSubtree) return;
      event.preventDefault();
      setCtxMenu({ x: event.clientX, y: event.clientY, nodeId: node.id });
    },
    [onDeleteSubtree]
  );

  const handleDelete = useCallback(() => {
    if (!ctxMenu || !onDeleteSubtree) return;
    onDeleteSubtree(ctxMenu.nodeId);
    setCtxMenu(null);
  }, [ctxMenu, onDeleteSubtree]);

  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        onNodeContextMenu={handleNodeContextMenu}
        fitView
        fitViewOptions={{ padding: 0.4 }}
        nodesDraggable
        proOptions={{ hideAttribution: true }}
        style={{ background: '#080810' }}
        minZoom={0.05}
        maxZoom={3}
      >
        <Background gap={30} size={0.3} color="#141428" />
        <Controls
          showInteractive={false}
          position="bottom-center"
          orientation="horizontal"
          style={{
            background: '#0f0f1a',
            border: '1px solid #2a2a40',
            borderRadius: 10,
            padding: '2px 4px',
            display: 'flex',
            gap: 2
          }}
        />
      </ReactFlow>
      {ctxMenu && onDeleteSubtree && (
        <div
          className="fixed z-[100] min-w-[160px] py-1 rounded-lg shadow-2xl border border-gray-700/80 backdrop-blur-xl"
          style={{ top: ctxMenu.y, left: ctxMenu.x, background: 'rgba(17,17,27,0.96)' }}
        >
          <button
            type="button"
            onClick={handleDelete}
            className="w-full text-left px-3 py-1.5 text-[12px] text-red-400 hover:bg-red-600/20 hover:text-red-300 flex items-center gap-2"
          >
            <span>✕</span>
            <span>Delete subtree</span>
          </button>
        </div>
      )}
    </>
  );
}

export interface TracebackConversationTreeProps {
  messages: MessageResponse[];
  /** Usually the assistant message id for the active turn (matches Traceback web app). */
  activeMessageId: string | null;
  onSelectUserNode: (userMessageId: string) => void;
  onDeleteSubtree?: (userMessageId: string) => void;
}

export function TracebackConversationTree({
  messages,
  activeMessageId,
  onSelectUserNode,
  onDeleteSubtree
}: TracebackConversationTreeProps) {
  const { nodes: rawNodes, edges: rawEdges, activePathIds } = useMemo(
    () => buildGraph(messages, activeMessageId),
    [messages, activeMessageId]
  );

  const nodeIds = useMemo(() => rawNodes.map((n) => n.id).join(','), [rawNodes]);
  const edgeIds = useMemo(() => rawEdges.map((e) => e.id).join(','), [rawEdges]);

  const layoutNodes = useMemo(
    () => layoutTree(rawNodes, rawEdges),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodeIds, edgeIds]
  );

  const messageById = useMemo(() => new Map(messages.map((m) => [m.id, m])), [messages]);

  const styledNodes: Node[] = useMemo(() => {
    const active = activeMessageId ? messageById.get(activeMessageId) : undefined;
    return layoutNodes.map((n) => {
      const isFocusUserTurn =
        n.id === activeMessageId ||
        (active?.role === 'assistant' && active.parentId === n.id);
      return {
        ...n,
        type: 'custom' as const,
        data: {
          ...n.data,
          isActive: isFocusUserTurn,
          isOnActivePath: activePathIds.has(n.id)
        }
      };
    });
  }, [layoutNodes, activeMessageId, activePathIds, messageById]);

  const styledEdges: Edge[] = useMemo(
    () =>
      rawEdges.map((e) => {
        const onPath = activePathIds.has(e.source) && activePathIds.has(e.target);
        return {
          ...e,
          type: 'smoothstep',
          animated: onPath,
          style: { stroke: onPath ? '#10b981' : '#1e293b', strokeWidth: onPath ? 2 : 1 }
        };
      }),
    [rawEdges, activePathIds]
  );

  if (messages.length === 0) {
    return (
      <div style={{ fontSize: 12, opacity: 0.38, padding: '12px 4px' }}>
        Send a message in Chat to build a branching tree on the Traceback API.
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 rounded-lg overflow-hidden border border-white/[0.08]">
      <div className="px-3 py-2 border-b border-gray-800 flex items-center justify-between flex-shrink-0 bg-[#0a0a12]">
        <p className="text-[10px] text-gray-500 uppercase tracking-widest">Conversation tree</p>
      </div>
      <div className="flex-1 h-0 min-h-[280px]">
        <ReactFlowProvider>
          <TreeFlowInner
            nodes={styledNodes}
            edges={styledEdges}
            focusUserNodeId={anchorUserMessageId(messages, activeMessageId)}
            onSelectUserNode={onSelectUserNode}
            onDeleteSubtree={onDeleteSubtree}
          />
        </ReactFlowProvider>
      </div>
    </div>
  );
}
