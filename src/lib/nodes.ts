export const SPHERE_RADIUS = 2.08;
export const ORB_RADIUS = 0.084;
export const PICK_RADIUS = 0.128;
export const IDLE_SPIN = 0.0112;

export const SPHERE_SIZES = [8, 16, 32, 64, 128] as const;
export type SphereSize = (typeof SPHERE_SIZES)[number];
export const DEFAULT_SPHERE_SIZE: SphereSize = 64;

export function isSphereSize(n: unknown): n is SphereSize {
  return typeof n === "number" && (SPHERE_SIZES as readonly number[]).includes(n);
}

export type Vec3 = [number, number, number];

export type GraphNode = {
  id: string;
  index: number;
  size: SphereSize;
  position: Vec3;
};

function ringPoints(
  radius: number,
  rings: { y: number; count: number; phase: number }[],
): Vec3[] {
  const out: Vec3[] = [];
  for (const ring of rings) {
    const y = ring.y * radius;
    const rho = Math.sqrt(Math.max(0, 1 - ring.y * ring.y)) * radius;
    for (let i = 0; i < ring.count; i++) {
      const t = ring.phase + (i / ring.count) * Math.PI * 2;
      out.push([Math.cos(t) * rho, y, Math.sin(t) * rho]);
    }
  }
  return out;
}

function squareAntiprism(radius: number): Vec3[] {
  return ringPoints(radius, [
    { y: 0.5, count: 4, phase: 0 },
    { y: -0.5, count: 4, phase: Math.PI / 4 },
  ]);
}

function sphere16(radius: number): Vec3[] {
  return [
    [0, radius, 0],
    ...ringPoints(radius, [
      { y: 0.48, count: 7, phase: 0 },
      { y: -0.48, count: 7, phase: Math.PI / 7 },
    ]),
    [0, -radius, 0],
  ];
}

export function fibonacciSphere(count: number, radius: number): Vec3[] {
  const out: Vec3[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  const n = Math.max(count, 2);
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    out.push([
      Math.cos(theta) * r * radius,
      y * radius,
      Math.sin(theta) * r * radius,
    ]);
  }
  return out;
}

function pointsForSize(size: SphereSize, radius: number): Vec3[] {
  if (size === 8) return squareAntiprism(radius);
  if (size === 16) return sphere16(radius);
  return fibonacciSphere(size, radius);
}

function dist2(a: Vec3, b: Vec3) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return dx * dx + dy * dy + dz * dz;
}

function neighborCount(size: SphereSize) {
  if (size <= 8) return 4;
  if (size <= 16) return 5;
  return 3;
}

export function buildEdges(positions: Vec3[], neighbors: number): [number, number][] {
  const nearest: number[] = [];
  for (let i = 0; i < positions.length; i++) {
    const a = positions[i];
    if (!a) continue;
    let best = Infinity;
    for (let j = 0; j < positions.length; j++) {
      if (i === j) continue;
      const b = positions[j];
      if (!b) continue;
      const d = dist2(a, b);
      if (d < best) best = d;
    }
    nearest.push(Math.sqrt(best));
  }
  const sorted = [...nearest].sort((x, y) => x - y);
  const mid = sorted[Math.floor(sorted.length / 2)] ?? 1;
  const maxEdge = mid * (positions.length <= 16 ? 2.45 : 1.9);

  const seen = new Set<string>();
  const edges: [number, number][] = [];
  for (let i = 0; i < positions.length; i++) {
    const origin = positions[i];
    if (!origin) continue;
    const scored: { j: number; d: number }[] = [];
    for (let j = 0; j < positions.length; j++) {
      if (i === j) continue;
      const other = positions[j];
      if (!other) continue;
      scored.push({ j, d: dist2(origin, other) });
    }
    scored.sort((a, b) => a.d - b.d);
    for (const s of scored.slice(0, neighbors)) {
      if (Math.sqrt(s.d) > maxEdge) continue;
      const a = Math.min(i, s.j);
      const b = Math.max(i, s.j);
      const key = `${a}-${b}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push([a, b]);
    }
  }
  return edges;
}

function scalePos(p: Vec3, s: number): Vec3 {
  return [p[0] * s, p[1] * s, p[2] * s];
}

export function nodeId(size: SphereSize, index: number) {
  return `s${size}-${index}`;
}

type Graph = {
  nodes: GraphNode[];
  surface: [number, number][];
  inner: [number, number][];
};

function makeGraph(size: SphereSize): Graph {
  const positions = pointsForSize(size, SPHERE_RADIUS);
  const nodes: GraphNode[] = positions.map((position, i) => ({
    id: nodeId(size, i),
    index: i,
    size,
    position,
  }));
  const k = neighborCount(size);
  return {
    nodes,
    surface: buildEdges(positions, k),
    inner: buildEdges(positions, Math.max(3, k - 1)),
  };
}

const GRAPHS = Object.fromEntries(
  SPHERE_SIZES.map((size) => [size, makeGraph(size)]),
) as Record<SphereSize, Graph>;

export function getNodes(size: SphereSize) {
  return GRAPHS[size].nodes;
}

export function getSurfaceEdges(size: SphereSize) {
  return GRAPHS[size].surface;
}

export function getInnerEdges(size: SphereSize) {
  return GRAPHS[size].inner;
}

export const NODE_BY_ID = new Map(
  SPHERE_SIZES.flatMap((size) => GRAPHS[size].nodes.map((n) => [n.id, n] as const)),
);

export const MESH_LAYERS = {
  outer: 1,
  inner: 0.78,
} as const;

export function edgePositions(
  nodes: GraphNode[],
  edges: [number, number][],
  radiusScale: number,
): Float32Array {
  const pts: number[] = [];
  for (const [ia, ib] of edges) {
    const a = nodes[ia];
    const b = nodes[ib];
    if (!a || !b) continue;
    const pa = scalePos(a.position, radiusScale);
    const pb = scalePos(b.position, radiusScale);
    pts.push(...pa, ...pb);
  }
  return new Float32Array(pts);
}

export function radialPositions(nodes: GraphNode[]): Float32Array {
  const pts: number[] = [];
  for (const node of nodes) {
    const inner = scalePos(node.position, MESH_LAYERS.inner);
    pts.push(...node.position, ...inner);
  }
  return new Float32Array(pts);
}
