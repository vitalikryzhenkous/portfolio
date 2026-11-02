import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  BaseEdge,
  Controls,
  Handle,
  Position,
  getSmoothStepPath,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
  type OnSelectionChangeParams,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import graph from '../data/graph.json';
import { track } from '../lib/track';

type Card = { what: string; why: string; decision: string; link?: string };
type Active = { label: string; where: string; card: Card };
type Scenario = (typeof graph.scenarios)[number];
type PlatformData = { label: string; status: string; layer: string; card: Card; lit: boolean };
type LayerData = { label: string };
type FrameData = { label: string };
type Pulse = { run: number; reverse: boolean };
type FlowEdgeData = { pulse: Pulse | null };

const { nodeWidth: W, nodeHeight: H } = graph.size;
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
// Case pages that exist; links to the rest stay hidden until the page ships (no 404s).
const LIVE_CASES = new Set<string>(['work/jev', 'work/platform']);

const TRAVEL_MS = 1100; // one pulse along an edge
const PAUSE_MS = 1700; // reading time after the pulse lands

const STATUS_LABEL: Record<string, string> = {
  running: 'running',
  'code-only': 'code only, not deployed',
  active: 'in use',
};

const edgeById = new Map(graph.edges.map((e) => [e.id, e]));

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function PlatformNode({ data, selected }: NodeProps<Node<PlatformData>>) {
  const cls = ['pg-node', `pg-${data.layer}`, selected && 'pg-selected', data.lit && 'pg-lit'].filter(Boolean).join(' ');
  return (
    <div className={cls} style={{ width: W, height: H }}>
      <Handle type="target" position={Position.Left} className="pg-handle" />
      <span className={`pg-dot pg-dot-${data.status}`} aria-hidden="true" />
      <span className="pg-label">{data.label}</span>
      <Handle type="source" position={Position.Right} className="pg-handle" />
    </div>
  );
}

function FrameNode({ data, selected }: NodeProps<Node<FrameData>>) {
  return (
    <div className={`pg-frame${selected ? ' pg-selected' : ''}`}>
      <span className="pg-frame-label">{data.label}</span>
    </div>
  );
}

function LayerNode({ data }: NodeProps<Node<LayerData>>) {
  return <div className="pg-layer">{data.label}</div>;
}

/** Smooth-step edge that can send one pulse along its path (SVG animateMotion, restarted per run). */
function FlowEdge(props: EdgeProps<Edge<FlowEdgeData>>) {
  const [path, labelX, labelY] = getSmoothStepPath(props);
  const motion = useRef<SVGAnimateMotionElement>(null);
  const pulse = props.data?.pulse ?? null;

  useEffect(() => {
    if (pulse) motion.current?.beginElement();
  }, [pulse?.run]);

  return (
    <>
      <BaseEdge
        id={props.id}
        path={path}
        labelX={labelX}
        labelY={labelY}
        {...(props.label ? { label: props.label } : {})}
        labelBgPadding={[4, 2]}
        labelBgBorderRadius={4}
        {...(props.markerEnd ? { markerEnd: props.markerEnd } : {})}
      />
      {pulse ? (
        <circle r={5} className="pg-pulse">
          <animateMotion
            ref={motion}
            begin="indefinite"
            dur={`${TRAVEL_MS}ms`}
            fill="freeze"
            path={path}
            keyPoints={pulse.reverse ? '1;0' : '0;1'}
            keyTimes="0;1"
            calcMode="linear"
          />
        </circle>
      ) : null}
    </>
  );
}

const nodeTypes = { platform: PlatformNode, layer: LayerNode, frame: FrameNode };

const layerLabel = (id: string) => graph.layers.find((l) => l.id === id)?.label ?? id;
function activeFor(id: string): Active | null {
  const n = graph.nodes.find((x) => x.id === id);
  if (n) {
    const part = n.group ? ` · part of ${graph.groups.find((g) => g.id === n.group)?.label ?? n.group}` : '';
    return { label: n.label, where: `${layerLabel(n.layer)} · ${STATUS_LABEL[n.status] ?? n.status}${part}`, card: n.card };
  }
  const g = graph.groups.find((x) => x.id === id);
  return g ? { label: g.label, where: `${layerLabel('services')} · project`, card: g.card } : null;
}
const edgeTypes = { flow: FlowEdge };

export default function PlatformGraph() {
  const [active, setActive] = useState<Active | null>(null);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [step, setStep] = useState(-1);
  const [run, setRun] = useState(0);
  const autoplayed = useRef(false);
  const host = useRef<HTMLDivElement>(null);

  // --- playback --------------------------------------------------------------------------------
  const play = useCallback((s: Scenario) => {
    setScenario(s);
    setStep(0);
    setRun((r) => r + 1);
  }, []);
  const stop = useCallback(() => {
    setScenario(null);
    setStep(-1);
  }, []);

  useEffect(() => {
    if (!scenario || step < 0) return;
    const reduced = prefersReducedMotion();
    const t = window.setTimeout(
      () => {
        if (step + 1 < scenario.steps.length) {
          setStep(step + 1);
          setRun((r) => r + 1);
        } else {
          setStep(scenario.steps.length); // finished: keep the last caption, clear pulses
        }
      },
      (reduced ? 0 : TRAVEL_MS) + PAUSE_MS + (scenario.steps[step]?.caption.length ?? 0) * 18,
    );
    return () => window.clearTimeout(t);
  }, [scenario, step]);

  // Autoplay the first scenario once, when the graph scrolls into view (not with reduced motion).
  useEffect(() => {
    const el = host.current;
    const first = graph.scenarios[0];
    if (!el || !first || prefersReducedMotion()) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !autoplayed.current) {
          autoplayed.current = true;
          play(first);
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [play]);

  const current = scenario && step >= 0 && step < scenario.steps.length ? scenario.steps[step] : null;
  const pulses = useMemo(() => new Map((current?.pulses ?? []).map((p) => [p.edge, p.reverse])), [current]);
  const litNodes = useMemo(() => {
    const s = new Set<string>();
    for (const id of pulses.keys()) {
      const e = edgeById.get(id);
      if (e) s.add(e.source).add(e.target);
    }
    return s;
  }, [pulses]);

  // --- graph -----------------------------------------------------------------------------------
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
      data: { label: n.label, status: n.status, layer: n.layer, card: n.card, lit: litNodes.has(n.id) },
      draggable: false,
      ariaLabel: `${n.label}, ${STATUS_LABEL[n.status] ?? n.status}. Press Enter for details.`,
    }));
    const frames: Node<FrameData>[] = graph.groups.map((g) => ({
      id: g.id,
      type: 'frame',
      position: { x: g.x, y: g.y },
      data: { label: g.label },
      draggable: false,
      zIndex: -1,
      style: { width: g.width, height: g.height },
      ariaLabel: `${g.label}, project with ${g.members.length} parts. Press Enter for details.`,
    }));
    return [...headers, ...frames, ...items];
  }, [litNodes]);

  const edges = useMemo<Edge<FlowEdgeData>[]>(
    () =>
      graph.edges.map((e) => {
        const reverse = pulses.get(e.id);
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          type: 'flow',
          className: `pg-edge pg-edge-${e.kind}${reverse !== undefined ? ' pg-edge-live' : ''}`,
          ...('label' in e && e.label ? { label: e.label } : {}),
          data: { pulse: reverse !== undefined && !prefersReducedMotion() ? { run, reverse } : null },
        };
      }),
    [pulses, run],
  );

  const onSelectionChange = useCallback(({ nodes: sel }: OnSelectionChangeParams) => {
    // Open on selection (mouse or Enter on a focused node). An empty selection does NOT close the card:
    // the animation rebuilds nodes every step, which clears React Flow's selection. Close = × or pane click.
    const id = sel[0]?.id;
    if (id) setActive(activeFor(id));
  }, []);

  const playing = scenario !== null && step >= 0 && step < scenario.steps.length;
  const caption = scenario && step >= 0 ? scenario.steps[Math.min(step, scenario.steps.length - 1)]?.caption : null;

  return (
    <div className="pg" ref={host}>
      <div className="pg-main">
        <div className="pg-player" role="group" aria-label="Animated flows">
          {graph.scenarios.map((s) => (
            <button
              key={s.id}
              type="button"
              className={scenario?.id === s.id ? 'pg-btn pg-btn-on' : 'pg-btn'}
              aria-pressed={scenario?.id === s.id}
              onClick={() => {
                track(`graph-flow:${s.id}`, s.title);
                play(s);
              }}
            >
              ▶ {s.title}
            </button>
          ))}
          {playing ? (
            <button type="button" className="pg-btn pg-btn-stop" onClick={stop}>
              ■ Stop
            </button>
          ) : null}        </div>
        <p className="pg-caption" aria-live="polite">
          {caption ? (
            <>
              <span className="pg-step">
                {Math.min(step, (scenario?.steps.length ?? 1) - 1) + 1}/{scenario?.steps.length}
              </span>{' '}
              {caption}
            </>
          ) : (
            <span className="muted">Pick a flow to watch data move through the platform.</span>
          )}
        </p>
        <div
          className="pg-canvas"
          onKeyDown={(e) => {
            // Keyboard: Enter/Space on a focused node opens its card, Escape closes it. React Flow's own
            // keyboard selection goes through onNodesChange, which this read-only graph does not use.
            if (e.key === 'Escape') return setActive(null);
            if (e.key !== 'Enter' && e.key !== ' ') return;
            const id = (e.target as HTMLElement).closest('.react-flow__node')?.getAttribute('data-id');
            const a = id ? activeFor(id) : null;
            if (a) {
              e.preventDefault();
              setActive(a);
            }
          }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onSelectionChange={onSelectionChange}
            onNodeClick={(_, n) => {
              track(`graph-node:${n.id}`);
              setActive(activeFor(n.id));
            }}
            onPaneClick={() => setActive(null)}
            fitView
            fitViewOptions={{ padding: 0.06 }}
            minZoom={0.2}
            maxZoom={1.6}
            nodesConnectable={false}
            elementsSelectable
          >
            <Background gap={24} size={1} />
            <Controls showInteractive={false} />
          </ReactFlow>
          {active ? (
            <aside className="pg-card" aria-live="polite" aria-label={`${active.label} details`}>
              <button type="button" className="pg-close" aria-label="Close details" onClick={() => setActive(null)}>
                ×
              </button>
              <p className="pg-card-layer">{active.where}</p>
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
            </aside>
          ) : null}
        </div>
      </div>
    </div>
  );
}
