// Build src/data/graph.json from the agent-wiki service registry + the public allowlist.
//
//   node scripts/build-graph.ts [path/to/services.md]
//
// Runs locally on the server (the registry is private); the generated JSON is committed.
// Privacy by construction: from each registry row only two enums are derived — status and
// whether it is reachable inside the tailnet. Names, ports, hosts and paths never leave this script.
// Rows that are not in the allowlist are dropped and reported by row number only.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ELK from 'elkjs/lib/elk.bundled.js';

type Card = { what: string; why: string; decision: string; link?: string };
type Status = 'running' | 'code-only' | 'active';
type AllowNode = { id: string; layer: string; label: string; card: Card };
type AllowService = { id: string; label: string; card: Card };
type Edge = { source: string; target: string; kind: string; label?: string };
type AllowGroup = { id: string; layer: string; label: string; members: string[]; card: Card };
type Allowlist = {
  layers: { id: string; label: string }[];
  groups?: AllowGroup[];
  nodes: AllowNode[];
  services: Record<string, AllowService>;
  edges: Edge[];
};

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const registryPath = resolve(process.argv[2] ?? resolve(root, '../agent-wiki/conventions/services.md'));
const allow: Allowlist = JSON.parse(readFileSync(resolve(root, 'data/graph-allowlist.json'), 'utf8'));
const registry = readFileSync(registryPath, 'utf8');

// --- 1. registry → { status, tailnet } per allowlisted service --------------------------------
type Derived = { status: Status; tailnet: boolean };
const derived = new Map<string, Derived>();
const dropped: number[] = [];

const lines = registry.split('\n');
lines.forEach((line, i) => {
  if (!line.startsWith('|') || /^\|\s*-/.test(line) || /^\|\s*Service\s*\|/.test(line)) return;
  const cells = line.split('|').slice(1, -1).map((c) => c.trim());
  if (cells.length < 8) return;
  const [service, , , , node, address, , status] = cells as [string, ...string[]];
  const pub = allow.services[service];
  if (!pub) {
    dropped.push(i + 1);
    return;
  }
  const deployed = /^running/.test(status ?? '');
  const hasNode = !!node && node !== '—' && !/later/.test(node);
  const served = /serve|tailnet/.test(address ?? '');
  derived.set(pub.id, {
    status: deployed ? 'running' : 'code-only',
    tailnet: deployed && ((hasNode && address !== '—') || served),
  });
});

// Non-docker services are listed in prose; only accept the ones that are allowlisted.
for (const [name, pub] of Object.entries(allow.services)) {
  if (derived.has(pub.id)) continue;
  if (registry.includes(`\`${name}.service\``)) derived.set(pub.id, { status: 'running', tailnet: false });
}

const missing = Object.values(allow.services).filter((s) => !derived.has(s.id));
if (missing.length) {
  console.error(`build-graph: allowlisted services not found in registry: ${missing.map((s) => s.id).join(', ')}`);
  process.exit(1);
}

// --- 2. nodes + edges --------------------------------------------------------------------------
type OutNode = { id: string; layer: string; label: string; status: Status; card: Card; x: number; y: number };
const nodes: Omit<OutNode, 'x' | 'y'>[] = [
  ...allow.nodes.map((n) => ({ ...n, status: 'active' as const })),
  ...Object.values(allow.services).map((s) => ({
    id: s.id,
    layer: 'services',
    label: s.label,
    status: derived.get(s.id)!.status,
    card: s.card,
  })),
];
const ids = new Set(nodes.map((n) => n.id));
const edges: Edge[] = [
  ...allow.edges,
  ...[...derived].filter(([, d]) => d.tailnet).map(([id]) => ({ source: 'tailnet', target: id, kind: 'tailnet' })),
];
// Groups: one project drawn as a frame around its components (same layer only, no overlaps).
const groups = allow.groups ?? [];
const groupOf = new Map<string, AllowGroup>();
for (const g of groups) {
  for (const m of g.members) {
    const n = nodes.find((x) => x.id === m);
    if (!n || n.layer !== g.layer || groupOf.has(m)) {
      console.error(`build-graph: group ${g.id}: member ${m} missing, in another layer, or in two groups`);
      process.exit(1);
    }
    groupOf.set(m, g);
  }
}
for (const e of edges) {
  if (!ids.has(e.source) || !ids.has(e.target)) {
    console.error(`build-graph: edge ${e.source} → ${e.target} references an unknown node`);
    process.exit(1);
  }
}

// --- 3. layered layout (ELK), one partition per layer, left → right ----------------------------
const NODE_W = 190;
const NODE_H = 48;
const layerIndex = new Map(allow.layers.map((l, i) => [l.id, i]));
const elk = new ELK();
const laid = await elk.layout({
  id: 'root',
  layoutOptions: {
    'elk.algorithm': 'layered',
    'elk.direction': 'RIGHT',
    'elk.partitioning.activate': 'true',
    'elk.layered.spacing.nodeNodeBetweenLayers': '70',
    'elk.spacing.nodeNode': '22',
    'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
    'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
  },
  children: nodes.map((n) => ({
    id: n.id,
    width: NODE_W,
    height: NODE_H,
    layoutOptions: { 'elk.partitioning.partition': String(layerIndex.get(n.layer)) },
  })),
  edges: edges.map((e, i) => ({ id: `e${i}`, sources: [e.source], targets: [e.target] })),
});
// ELK may split a partition into several sub-layers; keep its vertical order (crossing
// minimisation) but snap every layer to one column so the picture reads as 6 columns.
const COL_GAP = 90;
const ROW_GAP = 26;
const degree = new Set(edges.flatMap((e) => [e.source, e.target]));
const elkPos = new Map((laid.children ?? []).map((c) => [c.id, { x: c.x ?? 0, y: c.y ?? 0 }]));
const columns = allow.layers.map((l) =>
  nodes
    .filter((n) => n.layer === l.id)
    .sort(
      (a, b) =>
        Number(!degree.has(a.id)) - Number(!degree.has(b.id)) || // unconnected nodes (e.g. not deployed) go last
        elkPos.get(a.id)!.y - elkPos.get(b.id)!.y ||
        elkPos.get(a.id)!.x - elkPos.get(b.id)!.x,
    ),
);
// A column is a list of blocks: a single node, or a group frame holding its members.
const GROUP_HEAD = 30; // frame title strip
const GROUP_PAD = 12;
const IN_GAP = 14;
type Block = { ids: string[]; group?: AllowGroup; top: number; height: number };
const blocksPerColumn = columns.map((col) => {
  const blocks: Block[] = [];
  const seen = new Set<string>();
  for (const n of col) {
    if (seen.has(n.id)) continue;
    const g = groupOf.get(n.id);
    const members = g ? col.filter((c) => groupOf.get(c.id) === g).map((c) => c.id) : [n.id];
    members.forEach((m) => seen.add(m));
    const height = g
      ? GROUP_HEAD + members.length * NODE_H + (members.length - 1) * IN_GAP + GROUP_PAD
      : NODE_H;
    blocks.push({ ids: members, ...(g ? { group: g } : {}), top: 0, height });
  }
  return blocks;
});
const columnHeight = (bs: Block[]) => bs.reduce((h, b) => h + b.height, 0) + (bs.length - 1) * ROW_GAP;
const tallest = Math.max(...blocksPerColumn.map(columnHeight));
const pos = new Map<string, { x: number; y: number }>();
const frames: { id: string; label: string; card: Card; x: number; y: number; width: number; height: number; members: string[] }[] = [];
blocksPerColumn.forEach((bs, ci) => {
  const x = ci * (NODE_W + COL_GAP);
  let y = (tallest - columnHeight(bs)) / 2;
  for (const b of bs) {
    if (b.group) {
      frames.push({
        id: b.group.id,
        label: b.group.label,
        card: b.group.card,
        x: x - GROUP_PAD,
        y: Math.round(y),
        width: NODE_W + 2 * GROUP_PAD,
        height: b.height,
        members: b.ids,
      });
      b.ids.forEach((id, i) => pos.set(id, { x, y: Math.round(y + GROUP_HEAD + i * (NODE_H + IN_GAP)) }));
    } else {
      pos.set(b.ids[0]!, { x, y: Math.round(y) });
    }
    y += b.height + ROW_GAP;
  }
});

// --- 4. scenarios: "a>b" / "<a>b" → edge id + direction, validated against the graph ---------------
type ScenarioIn = { id: string; title: string; steps: { edges: string[]; caption: string }[] };
const scenariosIn: { scenarios: ScenarioIn[] } = JSON.parse(
  readFileSync(resolve(root, 'data/graph-scenarios.json'), 'utf8'),
);
const edgeId = new Map(edges.map((e, i) => [`${e.source}>${e.target}`, `e${i}`]));
const scenarios = scenariosIn.scenarios.map((s) => ({
  id: s.id,
  title: s.title,
  steps: s.steps.map((step) => ({
    caption: step.caption,
    pulses: step.edges.map((ref) => {
      const reverse = ref.startsWith('<');
      const key = reverse ? ref.slice(1) : ref;
      const id = edgeId.get(key);
      if (!id) {
        console.error(`build-graph: scenario "${s.id}" references a missing edge ${key}`);
        process.exit(1);
      }
      return { edge: id, reverse };
    }),
  })),
}));

// --- 5. write ----------------------------------------------------------------------------------
const wikiCommit = (() => {
  try {
    return execFileSync('git', ['-C', dirname(registryPath), 'log', '-1', '--format=%h', '--', registryPath], {
      encoding: 'utf8',
    }).trim();
  } catch {
    return 'unknown';
  }
})();

const out = {
  $comment: 'Generated by scripts/build-graph.ts — do not edit by hand.',
  source: { registry: 'agent-wiki/conventions/services.md', commit: wikiCommit, allowlist: 'data/graph-allowlist.json' },
  size: { nodeWidth: NODE_W, nodeHeight: NODE_H },
  layers: allow.layers,
  nodes: nodes.map((n) => ({ ...n, ...pos.get(n.id)!, group: groupOf.get(n.id)?.id ?? null })),
  groups: frames,
  edges: edges.map((e, i) => ({ id: `e${i}`, ...e })),
  scenarios,
};
const outPath = resolve(root, 'src/data/graph.json');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');
console.log(
  `build-graph: ${out.nodes.length} nodes, ${out.edges.length} edges (wiki ${wikiCommit}); ` +
    `registry rows dropped (not allowlisted): ${dropped.length ? dropped.join(', ') : 'none'}`,
);
