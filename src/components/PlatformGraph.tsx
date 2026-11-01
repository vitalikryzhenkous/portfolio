import { useCallback, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  type Edge,
  type Node,
  type NodeProps,
  type OnSelectionChangeParams,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import graph from '../data/graph.json';

type Card = { what: string; why: string; decision: string; link?: string };
type GraphNode = (typeof graph.nodes)[number];
type PlatformData = { label: string; status: string; layer: string; card: Card };
type LayerData = { label: string };

const { nodeWidth: W, nodeHeight: H } = graph.size;
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
// Case pages that exist; links to the rest stay hidden until the page ships (no 404s).
const LIVE_CASES = new Set<string>([]);

const STATUS_LABEL: Record<string, string> = {
  running: 'running',
  'code-only': 'code only, not deployed',
  active: 'in use',
};

function PlatformNode({ data, selected }: NodeProps<Node<PlatformData>>) {
  return (
    <div className={`pg-node pg-${data.layer}${selected ? ' pg-selected' : ''}`} style={{ width: W, height: H }}>
      <Handle type="target" position={Position.Left} className="pg-handle" />
      <span className={`pg-dot pg-dot-${data.status}`} aria-hidden="true" />
      <span className="pg-label">{data.label}</span>
      <Handle type="source" position={Position.Right} className="pg-handle" />
    </div>
  );
}

function LayerNode({ data }: NodeProps<Node<LayerData>>) {
  return <div className="pg-layer">{data.label}</div>;
}

const nodeTypes = { platform: PlatformNode, layer: LayerNode };

export default function PlatformGraph() {
  const [active, setActive] = useState<GraphNode | null>(null);

  const nodes = useMemo<Node[]>(() => {
    const columnX = new Map<string, number>();
    for (const n of graph.nodes) columnX.set(n.layer, n.x);
    const top = Math.min(...graph.nodes.map((n) => n.y));
    const headers: Node<LayerData>[] = graph.layers.map((l) => ({
      id: `layer-${l.id}`,
      type: 'layer',
      position: { x: columnX.get(l.id) ?? 0, y: top - 56 },
      data: { label: l.label },
      draggable: false,
      selectable: false,
      focusable: false,
      style: { width: W },
    }));
    const items: Node<PlatformData>[] = graph.nodes.map((n) => ({
      id: n.id,
      type: 'platform',
      position: { x: n.x, y: n.y },
      data: { label: n.label, status: n.status, layer: n.layer, card: n.card },
      draggable: false,
      ariaLabel: `${n.label}, ${STATUS_LABEL[n.status] ?? n.status}. Press Enter for details.`,
    }));
    return [...headers, ...items];
  }, []);

  const edges = useMemo<Edge[]>(
    () =>
      graph.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: 'smoothstep',
        className: `pg-edge pg-edge-${e.kind}`,
        ...('label' in e && e.label ? { label: e.label } : {}),
        labelBgPadding: [4, 2] as [number, number],
        labelBgBorderRadius: 4,
      })),
    [],
  );

  const onSelectionChange = useCallback(({ nodes: sel }: OnSelectionChangeParams) => {
    const id = sel[0]?.id;
    setActive(id ? (graph.nodes.find((n) => n.id === id) ?? null) : null);
  }, []);

  return (
    <div className="pg">
      <div className="pg-canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onSelectionChange={onSelectionChange}
          fitView
          fitViewOptions={{ padding: 0.06 }}
          minZoom={0.2}
          maxZoom={1.6}
          nodesConnectable={false}
          elementsSelectable
          proOptions={{ hideAttribution: false }}
        >
          <Background gap={24} size={1} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      <aside className="pg-card" aria-live="polite">
        {active ? (
          <>
            <p className="pg-card-layer">
              {graph.layers.find((l) => l.id === active.layer)?.label} · {STATUS_LABEL[active.status]}
            </p>
            <h3>{active.label}</h3>
            <dl>
              <dt>What</dt>
              <dd>{active.card.what}</dd>
              <dt>Why</dt>
              <dd>{active.card.why}</dd>
              <dt>Decision</dt>
              <dd>{active.card.decision}</dd>
            </dl>
            {'link' in active.card && active.card.link && LIVE_CASES.has(active.card.link) ? (
              <a href={`${BASE}/${active.card.link}/`}>Case study →</a>
            ) : null}
          </>
        ) : (
          <p className="muted">Click a node (or Tab to it and press Enter) to see what it is, why it exists and the decision behind it.</p>
        )}
      </aside>
    </div>
  );
}
