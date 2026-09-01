import { useEffect, useRef, type MutableRefObject, type RefObject } from "react";
import { useThree } from "@react-three/fiber";
import {
  InstancedMesh,
  Raycaster,
  Vector2,
  Vector3,
  type Camera,
  type Group,
} from "three";
import { getNodes, PICK_RADIUS } from "@/lib/nodes";
import { projectNode, type OpenOrigin } from "@/lib/openAnim";
import { getMeta, useNexus } from "@/lib/store";

const worldUp = new Vector3(0, 1, 0);
const worldRight = new Vector3(1, 0, 0);
const ndc = new Vector2();
const raycaster = new Raycaster();
const nodeWorld = new Vector3();
const toCenter = new Vector3();

type DragRefs = {
  group: RefObject<Group | null>;
  mesh: RefObject<InstancedMesh | null>;
  velX: MutableRefObject<number>;
  velY: MutableRefObject<number>;
  dragging: MutableRefObject<boolean>;
  idleAt: MutableRefObject<number>;
};

function liveNode(index: number) {
  if (index < 0) return undefined;
  return getNodes(useNexus.getState().sphereSize)[index];
}

function pickIndex(
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement,
  camera: Camera,
  group: Group | null,
) {
  if (!group) return -1;
  const rect = canvas.getBoundingClientRect();
  ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(ndc, camera);
  const origin = raycaster.ray.origin;
  const dir = raycaster.ray.direction;
  const nodes = getNodes(useNexus.getState().sphereSize);
  const scale = group.scale.x || 1;
  const r = PICK_RADIUS * scale;
  const r2 = r * r;
  group.updateWorldMatrix(true, false);
  let best = -1;
  let bestT = Infinity;
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (!node) continue;
    nodeWorld
      .set(node.position[0], node.position[1], node.position[2])
      .applyMatrix4(group.matrixWorld);
    toCenter.copy(nodeWorld).sub(origin);
    const tca = toCenter.dot(dir);
    if (tca < 0) continue;
    const d2 = toCenter.lengthSq() - tca * tca;
    if (d2 > r2) continue;
    const t0 = tca - Math.sqrt(r2 - d2);
    if (t0 >= 0 && t0 < bestT) {
      bestT = t0;
      best = i;
    }
  }
  return best;
}

function originOf(
  index: number,
  canvas: HTMLCanvasElement,
  camera: Camera,
  group: Group | null,
): OpenOrigin | undefined {
  const node = liveNode(index);
  if (!node || !group) return undefined;
  return projectNode(node.position, group, camera, canvas);
}

export function useSphereDrag({
  group,
  mesh,
  velX,
  velY,
  dragging,
  idleAt,
}: DragRefs) {
  const { gl, camera, size } = useThree();
  const moved = useRef(false);
  const last = useRef({ x: 0, y: 0, t: 0 });
  const tap = useRef({ t: 0, index: -1 });
  const onDragChange = useRef<(v: boolean) => void>(() => {});

  const setDraggingUi = (value: boolean) => onDragChange.current(value);

  useEffect(() => {
    const el = gl.domElement;
    el.style.touchAction = "none";

    const openNode = (index: number) => {
      const node = liveNode(index);
      if (!node) return;
      const origin = originOf(index, el, camera, group.current);
      useNexus.getState().select(node.id);
      useNexus.getState().open(node.id, origin);
    };

    const onDown = (e: PointerEvent) => {
      dragging.current = true;
      moved.current = false;
      last.current = { x: e.clientX, y: e.clientY, t: performance.now() };
      velX.current = 0;
      velY.current = 0;
      setDraggingUi(true);
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* capture is best-effort */
      }
    };

    const onMove = (e: PointerEvent) => {
      const g = group.current;
      if (dragging.current && g) {
        const dx = e.clientX - last.current.x;
        const dy = e.clientY - last.current.y;
        if (Math.abs(dx) + Math.abs(dy) > 5) moved.current = true;
        const now = performance.now();
        const dt = Math.max((now - last.current.t) / 1000, 1 / 240);
        const ay = (dx / size.width) * Math.PI * 2.6;
        const ax = (dy / size.height) * Math.PI * 2.6;
        g.rotateOnWorldAxis(worldUp, ay);
        g.rotateOnWorldAxis(worldRight, ax);
        velY.current = ay / dt;
        velX.current = ax / dt;
        last.current = { x: e.clientX, y: e.clientY, t: now };
        useNexus.getState().setHovered(null);
        return;
      }

      const index = pickIndex(e.clientX, e.clientY, el, camera, group.current);
      const node = liveNode(index);
      useNexus.getState().setHovered(node?.id ?? null);
    };

    const finish = (e: PointerEvent) => {
      if (!dragging.current) return;
      dragging.current = false;
      idleAt.current = performance.now() + 1400;
      setDraggingUi(false);
      velX.current = Math.max(-7, Math.min(7, velX.current));
      velY.current = Math.max(-7, Math.min(7, velY.current));
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
      if (moved.current) return;

      const index = pickIndex(e.clientX, e.clientY, el, camera, group.current);
      const node = liveNode(index);
      const now = performance.now();
      if (node) {
        const state = useNexus.getState();
        state.select(node.id);
        const titled = Boolean(getMeta(state.meta, node.id).title);
        if (titled) {
          openNode(index);
        } else if (now - tap.current.t < 320 && tap.current.index === index) {
          openNode(index);
          tap.current = { t: 0, index: -1 };
        } else {
          tap.current = { t: now, index };
        }
      }
    };

    const onDbl = (e: MouseEvent) => {
      const index = pickIndex(e.clientX, e.clientY, el, camera, group.current);
      if (index >= 0) openNode(index);
    };

    const onContext = (e: Event) => e.preventDefault();

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", finish);
    el.addEventListener("pointercancel", finish);
    el.addEventListener("dblclick", onDbl);
    el.addEventListener("contextmenu", onContext);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", finish);
      el.removeEventListener("pointercancel", finish);
      el.removeEventListener("dblclick", onDbl);
      el.removeEventListener("contextmenu", onContext);
    };
  }, [
    camera,
    gl,
    group,
    mesh,
    size.width,
    size.height,
    dragging,
    idleAt,
    velX,
    velY,
  ]);

  return {
    bindDragging: (fn: (v: boolean) => void) => {
      onDragChange.current = fn;
    },
  };
}
