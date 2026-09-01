import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  InstancedMesh,
  Object3D,
  ShaderMaterial,
  Vector3,
  type Group,
} from "three";
import { glassFragment, glassVertex } from "@/components/scene/glassShaders";
import {
  edgePositions,
  getInnerEdges,
  getNodes,
  getSurfaceEdges,
  IDLE_SPIN,
  MESH_LAYERS,
  NODE_BY_ID,
  ORB_RADIUS,
  PICK_RADIUS,
  radialPositions,
  type GraphNode,
  type SphereSize,
} from "@/lib/nodes";
import {
  openProgress,
  openTiming,
  projectNode,
  type OpenOrigin,
} from "@/lib/openAnim";
import { PALETTE } from "@/lib/palette";
import { getMeta, useNexus } from "@/lib/store";
import { useSphereDrag } from "./useSphereDrag";

const dummy = new Object3D();
const tint = new Color();
const ICE = new Color(PALETTE.ice);
const worldUp = new Vector3(0, 1, 0);
const worldRight = new Vector3(1, 0, 0);

function lineGeometry(data: Float32Array) {
  const geom = new BufferGeometry();
  geom.setAttribute("position", new Float32BufferAttribute(data, 3));
  return geom;
}

function paintOrbs(
  nodes: GraphNode[],
  shell: InstancedMesh,
  core: InstancedMesh,
  hoveredId: string | null,
  selectedId: string | null,
  openId: string | null,
  growT: number,
  growDepth: number,
  delayPulse: number,
  meta: ReturnType<typeof useNexus.getState>["meta"],
) {
  let openScale = 1;
  if (openId && growT <= 0) openScale = delayPulse;
  else if (growT > 0) openScale = Math.max(0, 1 - growT / 0.16);

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (!node) continue;
    const saved = getMeta(meta, node.id);
    const hovered = node.id === hoveredId;
    const selected = node.id === selectedId;
    const opened = node.id === openId;
    let scale = 1;
    if (opened) scale = openScale;
    else if (hovered) scale *= 1.38;
    else if (selected) scale *= 1.2;

    dummy.position.set(node.position[0], node.position[1], node.position[2]);
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    shell.setMatrixAt(i, dummy.matrix);

    dummy.scale.setScalar(saved.color && scale > 0 ? scale * 0.32 : 0);
    dummy.updateMatrix();
    core.setMatrixAt(i, dummy.matrix);

    if (saved.color) tint.set(saved.color);
    else tint.copy(ICE);
    shell.setColorAt(i, tint);
    core.setColorAt(i, saved.color ? tint : ICE);
  }
  shell.instanceMatrix.needsUpdate = true;
  core.instanceMatrix.needsUpdate = true;
  if (shell.instanceColor) shell.instanceColor.needsUpdate = true;
  if (core.instanceColor) core.instanceColor.needsUpdate = true;
}

export function NodeSphere({
  onDraggingChange,
}: {
  onDraggingChange: (dragging: boolean) => void;
}) {
  const sphereSize = useNexus((s) => s.sphereSize);
  return (
    <SphereBody
      key={sphereSize}
      size={sphereSize}
      onDraggingChange={onDraggingChange}
    />
  );
}

function SphereBody({
  size,
  onDraggingChange,
}: {
  size: SphereSize;
  onDraggingChange: (dragging: boolean) => void;
}) {
  const nodes = getNodes(size);
  const group = useRef<Group>(null);
  const pick = useRef<InstancedMesh>(null);
  const shell = useRef<InstancedMesh>(null);
  const core = useRef<InstancedMesh>(null);
  const velX = useRef(0);
  const velY = useRef(0);
  const dragging = useRef(false);
  const idleAt = useRef(0);
  const appear = useRef(0);
  const reduced = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  const { bindDragging } = useSphereDrag({
    group,
    mesh: pick,
    velX,
    velY,
    dragging,
    idleAt,
  });
  bindDragging(onDraggingChange);

  const hoveredId = useNexus((s) => s.hoveredId);
  const selectedId = useNexus((s) => s.selectedId);
  const openId = useNexus((s) => s.openId);
  const openOrigin = useNexus((s) => s.openOrigin);
  const openStartedAt = useNexus((s) => s.openStartedAt);
  const meta = useNexus((s) => s.meta);
  const { camera, gl } = useThree();

  const glassMat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: glassVertex,
        fragmentShader: glassFragment,
        transparent: true,
        depthWrite: true,
        toneMapped: false,
      }),
    [],
  );

  const openFromId = (id: string) => {
    const node = NODE_BY_ID.get(id);
    const g = group.current;
    if (!node || !g) {
      useNexus.getState().open(id);
      return;
    }
    const origin = projectNode(node.position, g, camera, gl.domElement);
    useNexus.getState().open(id, origin);
  };

  useEffect(() => {
    const projectAll = () => {
      const g = group.current;
      if (!g) return [] as { id: string; origin: OpenOrigin }[];
      return nodes.map((node) => ({
        id: node.id,
        origin: projectNode(node.position, g, camera, gl.domElement),
      }));
    };
    window.__nexusTest = {
      openFront: () => {
        const ranked = projectAll().sort((a, b) => a.origin.depth - b.origin.depth);
        const pickNode = ranked[0];
        if (!pickNode) return null;
        useNexus.getState().open(pickNode.id, pickNode.origin);
        return pickNode;
      },
      openBack: () => {
        const ranked = projectAll().sort((a, b) => b.origin.depth - a.origin.depth);
        const pickNode = ranked[0];
        if (!pickNode) return null;
        useNexus.getState().open(pickNode.id, pickNode.origin);
        return pickNode;
      },
      close: () => useNexus.getState().close(),
      get: () => {
        const s = useNexus.getState();
        return {
          openId: s.openId,
          origin: s.openOrigin,
          startedAt: s.openStartedAt,
          token: s.openToken,
        };
      },
    };
    return () => {
      delete window.__nexusTest;
    };
  }, [nodes, camera, gl]);

  useLayoutEffect(() => {
    const mesh = pick.current;
    if (!mesh) return;
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (!node) continue;
      dummy.position.set(node.position[0], node.position[1], node.position[2]);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;

    if (shell.current && core.current) {
      paintOrbs(
        nodes,
        shell.current,
        core.current,
        null,
        null,
        null,
        0,
        0,
        1,
        meta,
      );
    }
  }, [meta, nodes]);

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    const d = Math.min(delta, 0.1);

    if (!reduced) {
      appear.current = Math.min(1, appear.current + d / 0.38);
      const t = 1 - (1 - appear.current) ** 3;
      g.scale.setScalar(0.86 + 0.14 * t);
    } else {
      g.scale.setScalar(1);
    }

    if (openId && !openOrigin) {
      const node = NODE_BY_ID.get(openId);
      if (node) {
        useNexus.getState().armOpen(
          projectNode(node.position, g, camera, gl.domElement),
        );
      }
    }

    if (!dragging.current && !openId) {
      const decay = Math.exp(-3.6 * d);
      velX.current *= decay;
      velY.current *= decay;
      if (Math.abs(velY.current) > 0.01) g.rotateOnWorldAxis(worldUp, velY.current * d);
      if (Math.abs(velX.current) > 0.01) {
        g.rotateOnWorldAxis(worldRight, velX.current * d);
      }
      if (
        !reduced &&
        performance.now() > idleAt.current &&
        Math.abs(velX.current) + Math.abs(velY.current) < 0.12
      ) {
        g.rotateOnWorldAxis(worldUp, IDLE_SPIN * d);
      }
    }

    const now = performance.now();
    const growT =
      openId && openOrigin && openStartedAt
        ? openProgress(now, openStartedAt, openOrigin.depth)
        : 0;
    const growDepth = openOrigin?.depth ?? 0;
    let delayPulse = 1;
    if (openId && openStartedAt && growT <= 0) {
      const { delay } = openTiming(growDepth);
      const u = delay > 0 ? Math.min(1, (now - openStartedAt) / delay) : 1;
      delayPulse = 1 + 0.22 * Math.sin(u * Math.PI);
    }

    if (shell.current && core.current) {
      paintOrbs(
        nodes,
        shell.current,
        core.current,
        hoveredId,
        selectedId,
        openId,
        growT,
        growDepth,
        delayPulse,
        meta,
      );
    }
  });

  const count = nodes.length;

  return (
    <group ref={group}>
      <Lattice size={size} />

      <instancedMesh
        ref={pick}
        args={[undefined, undefined, count]}
        frustumCulled={false}
        visible={false}
      >
        <sphereGeometry args={[PICK_RADIUS, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </instancedMesh>

      <instancedMesh
        ref={shell}
        args={[undefined, undefined, count]}
        frustumCulled={false}
        material={glassMat}
      >
        <sphereGeometry args={[ORB_RADIUS, 32, 32]} />
      </instancedMesh>

      <instancedMesh
        ref={core}
        args={[undefined, undefined, count]}
        frustumCulled={false}
      >
        <sphereGeometry args={[ORB_RADIUS, 12, 12]} />
        <meshBasicMaterial
          color={PALETTE.mist}
          transparent
          opacity={0.92}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>

      {nodes.map((node) => {
        const saved = getMeta(meta, node.id);
        if (!saved.title || node.id === openId) return null;
        return (
          <NodeLabel
            key={`label-${node.id}`}
            id={node.id}
            title={saved.title}
            position={node.position}
            onOpen={openFromId}
          />
        );
      })}
    </group>
  );
}

function NodeLabel({
  id,
  title,
  position,
  onOpen,
}: {
  id: string;
  title: string;
  position: [number, number, number];
  onOpen: (id: string) => void;
}) {
  const select = useNexus((s) => s.select);
  return (
    <Html
      position={position}
      center
      pointerEvents="auto"
      zIndexRange={[2, 0]}
      sprite
      distanceFactor={8}
    >
      <button
        type="button"
        className="glass-chip rounded-full px-3 py-1.5"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          select(id);
          onOpen(id);
        }}
      >
        <span className="font-display text-xs font-medium tracking-tight text-fg">
          {title}
        </span>
      </button>
    </Html>
  );
}

function Lattice({ size }: { size: SphereSize }) {
  const nodes = getNodes(size);
  const outer = useMemo(
    () =>
      lineGeometry(
        edgePositions(nodes, getSurfaceEdges(size), MESH_LAYERS.outer),
      ),
    [nodes, size],
  );
  const inner = useMemo(
    () =>
      lineGeometry(edgePositions(nodes, getInnerEdges(size), MESH_LAYERS.inner)),
    [nodes, size],
  );
  const radials = useMemo(() => lineGeometry(radialPositions(nodes)), [nodes]);

  return (
    <group>
      <lineSegments geometry={outer} frustumCulled={false}>
        <lineBasicMaterial
          color={PALETTE.ice}
          transparent
          opacity={0.38}
          depthWrite={false}
        />
      </lineSegments>
      <lineSegments geometry={inner} frustumCulled={false}>
        <lineBasicMaterial
          color={PALETTE.ice}
          transparent
          opacity={0.18}
          depthWrite={false}
        />
      </lineSegments>
      <lineSegments geometry={radials} frustumCulled={false}>
        <lineBasicMaterial
          color={PALETTE.ice}
          transparent
          opacity={0.14}
          depthWrite={false}
        />
      </lineSegments>
    </group>
  );
}

declare global {
  interface Window {
    __nexusTest?: {
      openFront: () => { id: string; origin: OpenOrigin } | null;
      openBack: () => { id: string; origin: OpenOrigin } | null;
      close: () => void;
      get: () => {
        openId: string | null;
        origin: OpenOrigin | null;
        startedAt: number;
        token: number;
      };
    };
  }
}
