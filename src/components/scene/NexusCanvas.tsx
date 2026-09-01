import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useState } from "react";
import { PerspectiveCamera } from "three";
import { SPHERE_RADIUS } from "@/lib/nodes";
import { PALETTE } from "@/lib/palette";
import { LiquidSky, WaveField } from "./LiquidWaves";
import { NodeSphere } from "./NodeSphere";
import { Starfield } from "./Starfield";

function readDisplay() {
  const vv = window.visualViewport;
  return {
    dpr: Math.min(3, Math.max(1, window.devicePixelRatio || 1)),
    w: Math.max(1, Math.round(vv?.width ?? window.innerWidth)),
    h: Math.max(1, Math.round(vv?.height ?? window.innerHeight)),
  };
}

function useDisplay() {
  const [display, setDisplay] = useState(readDisplay);
  useEffect(() => {
    const sync = () => setDisplay(readDisplay());
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", sync);
    vv?.addEventListener("scroll", sync);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
      vv?.removeEventListener("resize", sync);
      vv?.removeEventListener("scroll", sync);
    };
  }, []);
  return display;
}

function CameraRig() {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);

  useLayoutEffect(() => {
    const dpr = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
    gl.setPixelRatio(dpr);
    const cam = camera as PerspectiveCamera;
    const aspect = width / Math.max(1, height);
    cam.aspect = aspect;
    cam.fov = 40;
    const fit = SPHERE_RADIUS + 0.62;
    const half = Math.tan((cam.fov * Math.PI) / 360);
    const dist = (Math.max(fit, fit / aspect) / half) * 1.06;
    cam.position.set(0, 0.42, dist);
    cam.near = 0.1;
    cam.far = Math.max(80, dist * 10);
    cam.lookAt(0, -0.12, 0);
    cam.updateProjectionMatrix();
  }, [camera, gl, width, height]);

  return null;
}

export function NexusCanvas({
  onDraggingChange,
}: {
  onDraggingChange: (dragging: boolean) => void;
}) {
  const { dpr } = useDisplay();

  return (
    <Canvas
      camera={{ position: [0, 0.42, 6.55], fov: 40, near: 0.1, far: 80 }}
      dpr={dpr}
      resize={{ debounce: 0, scroll: false }}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
        stencil: false,
        depth: true,
      }}
      onCreated={({ gl }) => {
        gl.setClearColor(PALETTE.black, 1);
        gl.setPixelRatio(Math.min(3, Math.max(1, window.devicePixelRatio || 1)));
        const canvas = gl.domElement;
        canvas.addEventListener(
          "webglcontextlost",
          (event) => {
            event.preventDefault();
          },
          false,
        );
      }}
      style={{
        touchAction: "none",
        width: "100%",
        height: "100%",
        display: "block",
      }}
    >
      <color attach="background" args={[PALETTE.black]} />
      <fog attach="fog" args={[PALETTE.black, 16, 40]} />
      <CameraRig />
      <ambientLight intensity={0.38} color={PALETTE.ice} />
      <directionalLight
        position={[4.2, 6.4, 3.2]}
        intensity={1.05}
        color={PALETTE.mist}
      />
      <directionalLight
        position={[-5, 1.2, -3.5]}
        intensity={0.4}
        color="#7ea0c8"
      />
      <pointLight
        position={[0, 0, 0]}
        intensity={0.85}
        color={PALETTE.ice}
        distance={7}
      />
      <LiquidSky />
      <Starfield />
      <WaveField />
      <NodeSphere onDraggingChange={onDraggingChange} />
    </Canvas>
  );
}
