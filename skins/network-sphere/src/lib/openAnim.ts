import {
  PerspectiveCamera,
  Vector3,
  type Camera,
  type Object3D,
} from "three";
import { ORB_RADIUS } from "@/lib/nodes";

export type OpenOrigin = {
  clientX: number;
  clientY: number;
  r: number;
  depth: number;
};

export type Rect = { x: number; y: number; w: number; h: number };

export type MorphStyle = {
  rect: Rect;
  radius: string;
  rotate: number;
};

const world = new Vector3();
const ndc = new Vector3();
const center = new Vector3();
const toNode = new Vector3();
const viewDir = new Vector3();

export const MORPH_DURATION = 2500;
export const FRONT_DELAY = 0;
export const BACK_DELAY = 520;
export const FRONT_DURATION = MORPH_DURATION;
export const BACK_DURATION = MORPH_DURATION;

export function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function easeOutCubic(t: number) {
  const x = clamp01(t);
  return 1 - (1 - x) ** 3;
}

export function easeRush(t: number) {
  const x = clamp01(t);
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return 1 - (1 - x) ** 4.6;
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp01((x - edge0) / Math.max(1e-6, edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export function backAmount(depth: number) {
  return clamp01((clamp01(depth) - 0.42) / 0.58);
}

export function openTiming(depth: number) {
  const back = backAmount(depth);
  return {
    delay: lerp(FRONT_DELAY, BACK_DELAY, back),
    duration: MORPH_DURATION,
  };
}

export function openProgress(now: number, startedAt: number, depth: number) {
  if (!startedAt) return 0;
  const { delay, duration } = openTiming(depth);
  return clamp01((now - startedAt - delay) / Math.max(1, duration));
}

export function openEase(t: number, depth: number) {
  return backAmount(depth) > 0.2 ? easeRush(t) : easeOutCubic(t);
}

export function projectNode(
  local: [number, number, number],
  group: Object3D,
  camera: Camera,
  canvas: HTMLCanvasElement,
): OpenOrigin {
  group.updateWorldMatrix(true, false);
  world.set(local[0], local[1], local[2]).applyMatrix4(group.matrixWorld);
  group.getWorldPosition(center);
  toNode.copy(world).sub(center);
  camera.getWorldDirection(viewDir);
  const depth =
    toNode.lengthSq() < 1e-8
      ? 0.5
      : clamp01(0.5 + 0.5 * toNode.normalize().dot(viewDir));

  ndc.copy(world).project(camera);
  const crect = canvas.getBoundingClientRect();
  const clientX = (ndc.x * 0.5 + 0.5) * crect.width + crect.left;
  const clientY = (-ndc.y * 0.5 + 0.5) * crect.height + crect.top;

  const persp = camera instanceof PerspectiveCamera ? camera : null;
  const fov = persp ? (persp.fov * Math.PI) / 180 : 0.7;
  const viewDist = Math.max(0.2, world.distanceTo(camera.position));
  const worldPerPx =
    (2 * Math.tan(fov / 2) * viewDist) / Math.max(1, crect.height);
  const r = Math.max(11, (ORB_RADIUS * 1.08) / worldPerPx);

  return { clientX, clientY, r, depth };
}

export function seedRect(origin: OpenOrigin): Rect {
  const back = backAmount(origin.depth);
  const r = Math.max(11, origin.r * (1 - back * 0.42));
  return {
    x: origin.clientX - r,
    y: origin.clientY - r,
    w: r * 2,
    h: r * 2,
  };
}

export function destRect(): Rect {
  const pw = window.innerWidth;
  const ph = window.innerHeight;
  const w = Math.min(340, pw - 24);
  const h = Math.min(380, ph - 24);
  return {
    x: Math.max(12, (pw - w) / 2),
    y: Math.max(12, (ph - h) / 2),
    w,
    h,
  };
}

export function mixRect(from: Rect, to: Rect, t: number): Rect {
  return {
    x: lerp(from.x, to.x, t),
    y: lerp(from.y, to.y, t),
    w: lerp(from.w, to.w, t),
    h: lerp(from.h, to.h, t),
  };
}

export function morphAt(origin: OpenOrigin, t: number): MorphStyle {
  const from = seedRect(origin);
  const to = destRect();
  const u = clamp01(t);
  const fromCx = from.x + from.w / 2;
  const fromCy = from.y + from.h / 2;
  const toCx = to.x + to.w / 2;
  const toCy = to.y + to.h / 2;

  const scx = window.innerWidth * 0.5;
  const scy = window.innerHeight * 0.5;
  let vx = fromCx - scx;
  let vy = fromCy - scy;
  const vlen = Math.hypot(vx, vy) || 1;
  vx /= vlen;
  vy /= vlen;
  const popCx = fromCx + vx * 58;
  const popCy = fromCy + vy * 46;

  const unhook = smoothstep(0, 0.24, u);
  const travel = smoothstep(0.16, 1, u);
  const cx = lerp(lerp(fromCx, popCx, unhook), toCx, travel);
  const cy = lerp(lerp(fromCy, popCy, unhook), toCy, travel);

  const grow = smoothstep(0.08, 0.94, u);
  const sizeE = easeOutCubic(grow);
  const live = 1 - sizeE;
  const squash = Math.sin(u * Math.PI * 3.55) * live * live * 0.16;
  const stretch = Math.sin(u * Math.PI * 2.2 + 0.85) * live * live * 0.13;
  const w = lerp(from.w, to.w, sizeE) * (1 + squash);
  const h = lerp(from.h, to.h, sizeE) * (1 + stretch - squash * 0.5);

  const rect: Rect = {
    x: cx - w / 2,
    y: cy - h / 2,
    w,
    h,
  };

  const settle = smoothstep(0.62, 1, u);
  const round = lerp(Math.min(w, h) * 0.5, 16, easeOutCubic(Math.max(grow, settle)));
  const amp = (1 - settle) * Math.min(w, h) * 0.3;
  const c: number[] = [];
  for (let i = 0; i < 8; i++) {
    const blob =
      Math.sin(u * Math.PI * (2.05 + i * 0.41) + i * 0.97) *
      amp *
      (0.72 + (i % 3) * 0.16);
    c.push(Math.max(12, round + blob));
  }
  const radius = `${c[0]}px ${c[1]}px ${c[2]}px ${c[3]}px / ${c[4]}px ${c[5]}px ${c[6]}px ${c[7]}px`;
  const rotate = Math.sin(u * Math.PI * 1.75) * (1 - settle) * 6.2;

  if (u >= 1) {
    return { rect: to, radius: "16px", rotate: 0 };
  }
  return { rect, radius, rotate };
}

export function applyRect(
  el: HTMLElement,
  rect: Rect,
  radius: number | string = 16,
  rotate = 0,
) {
  el.style.left = `${rect.x}px`;
  el.style.top = `${rect.y}px`;
  el.style.width = `${rect.w}px`;
  el.style.height = `${rect.h}px`;
  el.style.borderRadius = typeof radius === "number" ? `${radius}px` : radius;
  el.style.transform = rotate ? `rotate(${rotate}deg)` : "none";
}

export function applyMorph(el: HTMLElement, morph: MorphStyle) {
  applyRect(el, morph.rect, morph.radius, morph.rotate);
}
