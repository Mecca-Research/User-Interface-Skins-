export const skyVertex = /* glsl */ `
  varying vec3 vPos;

  void main() {
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const skyFragment = /* glsl */ `
  uniform float uTime;
  uniform vec3 uBlack;
  uniform vec3 uNavy;
  uniform vec3 uIce;
  varying vec3 vPos;

  void main() {
    vec3 p = normalize(vPos);
    float t = uTime * 0.16;
    vec2 uv = vec2(atan(p.z, p.x) * 0.31831, p.y);

    float e1 = sin(uv.x * 6.2 + t) * 0.5 + sin(uv.y * 8.4 - t * 0.72) * 0.5;
    vec2 q = uv + 0.2 * vec2(
      sin(uv.y * 5.1 + t * 0.9),
      cos(uv.x * 4.2 - t * 1.05)
    );
    float e2 = sin(q.x * 9.0 + t * 0.52) * cos(q.y * 7.2 - t * 0.38);
    float e3 = sin(length(uv * vec2(3.8, 6.2)) - t * 1.15);
    float w = e1 * 0.46 + e2 * 0.38 + e3 * 0.16;

    vec3 col = mix(uBlack, uNavy, smoothstep(-0.5, 0.62, w));
    float crest = pow(smoothstep(0.12, 0.88, w), 3.2);
    col += uIce * crest * 0.16;
    col = mix(col, uBlack, smoothstep(-0.15, -1.0, p.y) * 0.6);
    float vig = smoothstep(1.25, 0.18, length(p.xy));
    col *= 0.42 + 0.58 * vig;

    gl_FragColor = vec4(col, 1.0);
  }
`;

export const waveVertex = /* glsl */ `
  uniform float uTime;
  varying vec3 vWorld;
  varying float vElev;

  void main() {
    vec3 pos = position;
    float t = uTime * 0.52;
    float w1 = sin(pos.x * 0.52 + t) * 0.22;
    float w2 = cos(pos.y * 0.4 + t * 0.74) * 0.16;
    float w3 = sin((pos.x * 0.7 + pos.y * 0.55) - t * 0.46) * 0.12;
    pos.z += w1 + w2 + w3;
    vElev = pos.z;
    vec4 world = modelMatrix * vec4(pos, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

export const waveFragment = /* glsl */ `
  uniform vec3 uBlack;
  uniform vec3 uNavy;
  uniform vec3 uIce;
  varying vec3 vWorld;
  varying float vElev;

  void main() {
    vec3 dx = dFdx(vWorld);
    vec3 dy = dFdy(vWorld);
    vec3 n = normalize(cross(dx, dy));
    float ndl = clamp(dot(n, normalize(vec3(0.18, 0.9, 0.38))), 0.0, 1.0);
    vec3 col = mix(uBlack, uNavy, 0.5 + vElev * 0.85);
    col += uIce * pow(ndl, 5.5) * 0.26;
    col += uIce * smoothstep(0.1, 0.32, vElev) * 0.12;
    float fade = smoothstep(13.5, 4.4, length(vWorld.xz));
    gl_FragColor = vec4(col, fade);
  }
`;
