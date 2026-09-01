import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BackSide,
  Color,
  type ShaderMaterial,
} from "three";
import { PALETTE } from "@/lib/palette";
import { skyFragment, skyVertex, waveFragment, waveVertex } from "./shaders";

function useWaveUniforms() {
  return useMemo(
    () => ({
      uTime: { value: 0 },
      uBlack: { value: new Color(PALETTE.black) },
      uNavy: { value: new Color(PALETTE.navy) },
      uIce: { value: new Color(PALETTE.ice) },
    }),
    [],
  );
}

export function LiquidSky() {
  const material = useRef<ShaderMaterial>(null);
  const uniforms = useWaveUniforms();
  const reduced = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  useFrame(({ clock }, delta) => {
    const mat = material.current;
    if (!mat) return;
    const d = Math.min(delta, 0.1);
    if (reduced) {
      mat.uniforms.uTime.value = 0.4;
      return;
    }
    mat.uniforms.uTime.value = clock.elapsedTime;
    void d;
  });

  return (
    <mesh renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[18, 48, 32]} />
      <shaderMaterial
        ref={material}
        side={BackSide}
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={skyVertex}
        fragmentShader={skyFragment}
      />
    </mesh>
  );
}

export function WaveField() {
  const material = useRef<ShaderMaterial>(null);
  const uniforms = useWaveUniforms();
  const reduced = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  useFrame(({ clock }) => {
    const mat = material.current;
    if (!mat) return;
    mat.uniforms.uTime.value = reduced ? 0.8 : clock.elapsedTime;
  });

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -2.72, 0]}
      renderOrder={-1}
    >
      <planeGeometry args={[28, 28, 96, 96]} />
      <shaderMaterial
        ref={material}
        transparent
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={waveVertex}
        fragmentShader={waveFragment}
      />
    </mesh>
  );
}
