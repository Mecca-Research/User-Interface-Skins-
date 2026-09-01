import { Canvas, useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import { PALETTE } from "@/lib/palette";
import { LiquidSky, WaveField } from "./LiquidWaves";
import { NodeSphere } from "./NodeSphere";
import { Starfield } from "./Starfield";

function CameraRig() {
  const camera = useThree((s) => s.camera);
  const width = useThree((s) => s.size.width);

  useLayoutEffect(() => {
    camera.position.set(0, 0.52, width < 640 ? 8.5 : 6.55);
    camera.lookAt(0, -0.18, 0);
  }, [camera, width]);

  return null;
}

export function NexusCanvas({
  onDraggingChange,
}: {
  onDraggingChange: (dragging: boolean) => void;
}) {
  return (
    <Canvas
      camera={{ position: [0, 0.52, 6.55], fov: 40, near: 0.1, far: 60 }}
      dpr={[1, 1.5]}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
        stencil: false,
        depth: true,
      }}
      onCreated={({ gl }) => {
        gl.setClearColor(PALETTE.black, 1);
        const canvas = gl.domElement;
        canvas.addEventListener(
          "webglcontextlost",
          (event) => {
            event.preventDefault();
          },
          false,
        );
      }}
      style={{ touchAction: "none", height: "100%", width: "100%" }}
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
