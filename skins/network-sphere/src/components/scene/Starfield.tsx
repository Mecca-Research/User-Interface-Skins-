import { useMemo } from "react";
import { BufferGeometry, Float32BufferAttribute } from "three";
import { PALETTE } from "@/lib/palette";

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function starGeometry(count: number, radius: number, seed: number) {
  const rand = mulberry32(seed);
  const arr = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const z = rand() * 2 - 1;
    const t = rand() * Math.PI * 2;
    const r = Math.sqrt(Math.max(0, 1 - z * z));
    const jitter = radius * (0.92 + rand() * 0.16);
    arr[i * 3] = Math.cos(t) * r * jitter;
    arr[i * 3 + 1] = z * jitter;
    arr[i * 3 + 2] = Math.sin(t) * r * jitter;
  }
  const geom = new BufferGeometry();
  geom.setAttribute("position", new Float32BufferAttribute(arr, 3));
  return geom;
}

export function Starfield() {
  const near = useMemo(() => starGeometry(900, 15.5, 7), []);
  const far = useMemo(() => starGeometry(1400, 18.5, 21), []);

  return (
    <group>
      <points geometry={near} frustumCulled={false}>
        <pointsMaterial
          color={PALETTE.mist}
          size={0.028}
          sizeAttenuation
          transparent
          opacity={0.9}
          depthWrite={false}
          fog={false}
          toneMapped={false}
        />
      </points>
      <points geometry={far} frustumCulled={false}>
        <pointsMaterial
          color={PALETTE.ice}
          size={0.016}
          sizeAttenuation
          transparent
          opacity={0.55}
          depthWrite={false}
          fog={false}
          toneMapped={false}
        />
      </points>
    </group>
  );
}
