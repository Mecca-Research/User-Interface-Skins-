import { create } from "zustand";
import { autoColor } from "@/lib/color";
import {
  DEFAULT_SPHERE_SIZE,
  isSphereSize,
  NODE_BY_ID,
  type SphereSize,
} from "@/lib/nodes";
import type { OpenOrigin } from "@/lib/openAnim";

export type NodeMeta = {
  title: string;
  color: string | null;
  notes: string;
  opacity: number;
};

const META_KEY = "nexus-node-meta-v1";
const SIZE_KEY = "nexus-sphere-size";
const DEFAULT_OPACITY = 0.5;

function clampOpacity(n: number) {
  if (!Number.isFinite(n)) return DEFAULT_OPACITY;
  return Math.max(0.08, Math.min(0.96, n));
}

const emptyMeta = (): NodeMeta => ({
  title: "",
  color: null,
  notes: "",
  opacity: DEFAULT_OPACITY,
});

function loadMeta(): Record<string, NodeMeta> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(META_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, Partial<NodeMeta>>;
    const out: Record<string, NodeMeta> = {};
    for (const [id, value] of Object.entries(parsed)) {
      out[id] = {
        title: value.title ?? "",
        color: value.color ?? null,
        notes: value.notes ?? "",
        opacity: clampOpacity(
          typeof value.opacity === "number" ? value.opacity : DEFAULT_OPACITY,
        ),
      };
    }
    return out;
  } catch {
    return {};
  }
}

function loadSize(): SphereSize {
  if (typeof window === "undefined") return DEFAULT_SPHERE_SIZE;
  const n = Number(window.localStorage.getItem(SIZE_KEY));
  return isSphereSize(n) ? n : DEFAULT_SPHERE_SIZE;
}

function persistMeta(meta: Record<string, NodeMeta>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(META_KEY, JSON.stringify(meta));
}

function persistSize(size: SphereSize) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SIZE_KEY, String(size));
}

type NexusState = {
  sphereSize: SphereSize;
  hoveredId: string | null;
  selectedId: string | null;
  openId: string | null;
  openOrigin: OpenOrigin | null;
  openStartedAt: number;
  openToken: number;
  meta: Record<string, NodeMeta>;
  setSphereSize: (size: SphereSize) => void;
  setHovered: (id: string | null) => void;
  select: (id: string | null) => void;
  open: (id: string, origin?: OpenOrigin | null) => void;
  armOpen: (origin: OpenOrigin) => void;
  close: () => void;
  patchNode: (id: string, partial: Partial<NodeMeta>) => NodeMeta;
};

export function getMeta(
  meta: Record<string, NodeMeta>,
  id: string,
): NodeMeta {
  return meta[id] ?? emptyMeta();
}

export const useNexus = create<NexusState>((set, get) => ({
  sphereSize: loadSize(),
  hoveredId: null,
  selectedId: null,
  openId: null,
  openOrigin: null,
  openStartedAt: 0,
  openToken: 0,
  meta: loadMeta(),
  setSphereSize: (size) => {
    if (get().sphereSize === size) return;
    persistSize(size);
    set({
      sphereSize: size,
      hoveredId: null,
      selectedId: null,
      openId: null,
      openOrigin: null,
      openStartedAt: 0,
    });
  },
  setHovered: (id) => {
    if (get().hoveredId !== id) set({ hoveredId: id });
  },
  select: (id) => set({ selectedId: id }),
  open: (id, origin) => {
    set({
      openId: id,
      selectedId: id,
      openOrigin: origin ?? null,
      openStartedAt: origin ? performance.now() : 0,
      openToken: get().openToken + 1,
    });
  },
  armOpen: (origin) => {
    const cur = get();
    if (!cur.openId) return;
    if (cur.openOrigin && cur.openStartedAt) return;
    set({
      openOrigin: origin,
      openStartedAt: performance.now(),
    });
  },
  close: () =>
    set({
      openId: null,
      openOrigin: null,
      openStartedAt: 0,
    }),
  patchNode: (id, partial) => {
    const node = NODE_BY_ID.get(id);
    const prev = getMeta(get().meta, id);
    const title = (partial.title !== undefined ? partial.title : prev.title).trim();
    let color = partial.color !== undefined ? partial.color : prev.color;
    if (title && !color) {
      color = autoColor(node?.index ?? 0);
    }
    const next: NodeMeta = {
      title,
      color,
      notes: partial.notes !== undefined ? partial.notes : prev.notes,
      opacity: clampOpacity(
        partial.opacity !== undefined ? partial.opacity : prev.opacity,
      ),
    };
    const meta = { ...get().meta, [id]: next };
    persistMeta(meta);
    set({ meta });
    return next;
  },
}));
