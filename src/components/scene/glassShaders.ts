export const glassVertex = /* glsl */ `
varying vec3 vTint;
varying vec3 vWorldNormal;
varying vec3 vViewDir;

void main() {
#ifdef USE_INSTANCING_COLOR
  vTint = instanceColor;
#else
  vTint = vec3(0.62, 0.75, 0.86);
#endif
  vec4 worldPos = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vWorldNormal = normalize(mat3(modelMatrix * instanceMatrix) * normal);
  vViewDir = cameraPosition - worldPos.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

export const glassFragment = /* glsl */ `
varying vec3 vTint;
varying vec3 vWorldNormal;
varying vec3 vViewDir;

void main() {
  vec3 n = normalize(vWorldNormal);
  vec3 v = normalize(vViewDir);
  float ndv = max(dot(n, v), 0.0);
  float fresnel = pow(1.0 - ndv, 2.15);
  float rim = pow(1.0 - ndv, 4.2);

  vec3 lightDir = normalize(vec3(0.46, 0.9, 0.38));
  vec3 light2 = normalize(vec3(-0.55, 0.2, -0.4));
  vec3 reflectDir = reflect(-v, n);
  float spec = pow(max(dot(reflectDir, lightDir), 0.0), 36.0);
  float spec2 = pow(max(dot(reflectDir, light2), 0.0), 14.0) * 0.22;
  float fill = pow(max(dot(n, lightDir), 0.0), 1.15) * 0.32;

  vec3 glass = vec3(0.78, 0.9, 1.0);
  vec3 inner = mix(vec3(0.16, 0.24, 0.36), vTint, 0.55) * 0.7;
  vec3 col = inner * (0.55 + fill)
    + mix(glass, vTint, 0.28) * fresnel
    + glass * rim * 0.85
    + vec3(spec * 0.85 + spec2);
  float alpha = 0.34 + fresnel * 0.48 + spec * 0.14;

  gl_FragColor = vec4(col, alpha);
}
`;
