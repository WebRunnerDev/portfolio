// The Swarm's shaders (ADR-0013 › Сцена), GLSL ES 3.00. The scene shades in
// linear light; tone mapping is three.js's ACES filmic, as in the spike, so
// the dark theme looks as the owner picked it.

// Attribute locations, shared with swarm.ts.
export const A_HOME = 0
export const A_NORMAL = 1
export const A_NODE = 2
export const A_SEED = 3

// The logo's seven blocks.
export const BLOCKS = 7

// ACES filmic (Hill's fit, three.js's `ACESFilmicToneMapping`) at exposure
// 1.05, then to sRGB.
const TONE = /* glsl */ `
vec3 rrtOdt(vec3 v) {
  vec3 a = v * (v + 0.0245786) - 0.000090537;
  vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
  return a / b;
}
vec3 tone(vec3 c) {
  const mat3 IN = mat3(
    vec3(0.59719, 0.07600, 0.02840),
    vec3(0.35458, 0.90834, 0.13383),
    vec3(0.04823, 0.01566, 0.83777));
  const mat3 OUT = mat3(
    vec3(1.60475, -0.10208, -0.00327),
    vec3(-0.53108, 1.10813, -0.07276),
    vec3(-0.07367, -0.00605, 1.07602));
  c = clamp(OUT * rrtOdt(IN * (c * 1.05 / 0.6)), 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055,
    step(vec3(0.0031308), c));
}`

// The dust: every particle of a block is placed by the block's matrix, lit
// by the key light and a rim; before the gather it is scattered over the
// screen around its block and flies in at a time of its own (`aSeed.x`),
// warm while it flies.
export const DUST_VERTEX = /* glsl */ `#version 300 es
layout(location = ${A_HOME}) in vec3 aHome;
layout(location = ${A_NORMAL}) in vec3 aNormal;
layout(location = ${A_NODE}) in float aNode;
layout(location = ${A_SEED}) in vec4 aSeed;
uniform mat4 uViewProj;
uniform mat4 uBlock[${BLOCKS}];
uniform float uForm[${BLOCKS}];
uniform float uTime, uScale, uSizeK, uMinSize;
uniform vec3 uKey, uSteel, uRim, uFlash;
out vec3 vColor;
void main() {
  int id = int(aNode + 0.5);
  float lit = length(aNormal);
  vec3 normal = aNormal / max(lit, 1e-4);
  mat4 m = uBlock[id];
  float scale = length(m[0].xyz);
  vec3 formed = (m * vec4(aHome, 1.0)).xyz;
  vec3 n = normalize(mat3(m) * normal);
  float f = smoothstep(aSeed.x * 0.55, aSeed.x * 0.55 + 0.45, uForm[id]);
  vec3 drift = vec3(sin(uTime * 0.31 + aSeed.x * 40.0),
    cos(uTime * 0.27 + aSeed.y * 31.0), 0.0) * 0.7;
  vec3 scatter = m[3].xyz + (aSeed.yzw - 0.5) * vec3(26.0, 15.0, 8.0) + drift;
  vec3 p = mix(scatter, formed, f);
  float flash = (1.0 - f) * f * 2.0;
  vec4 clip = uViewProj * vec4(p, 1.0);
  gl_Position = clip;
  float size = 0.026 * uSizeK * scale * (0.75 + 0.5 * aSeed.z);
  gl_PointSize = max(size * uScale / clip.w, uMinSize);
  float lambert = max(dot(n, uKey), 0.0);
  float rim = pow(1.0 - abs(n.z), 3.0);
  vec3 color = uSteel * (0.1 + 0.72 * lambert) * lit
    + uRim * rim * 0.32 * lit;
  color *= 0.88 + 0.24 * aSeed.w;
  color += uFlash * clamp(flash, 0.0, 1.0) * 1.5;
  float fog = clamp(1.0 - (clip.w - 27.0) / 26.0, 0.25, 1.0);
  vColor = color * fog;
}`

// Round points. `uTone` when the scene draws straight to the canvas or to a
// buffer that can't hold light over 1: tone mapped here, not in the finish.
export const DUST_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
uniform float uTone;
in vec3 vColor;
out vec4 outColor;
${TONE}
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  if (dot(p, p) > 1.0) discard;
  outColor = vec4(uTone > 0.5 ? tone(vColor) : vColor, 1.0);
}`

// One triangle over the screen.
export const FINISH_VERTEX = /* glsl */ `#version 300 es
out vec2 vUv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`

// The finish: the scene over the page. Where it drew nothing (alpha 0) the
// page's `surface` shows as is, so the canvas never differs from the page
// around it. The vignette darkens the scene only, toward the corners; the
// grain is the spike's.
export const FINISH_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D uScene;
uniform vec3 uSurface;
uniform vec2 uSize;
uniform float uTone, uVignette, uGrain, uTime;
in vec2 vUv;
out vec4 outColor;
${TONE}
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}
void main() {
  vec4 scene = texture(uScene, vUv);
  vec3 c = scene.rgb;
  vec2 q = vUv - 0.5;
  q.x *= uSize.x / uSize.y;
  c *= 1.0 - 0.45 * uVignette * smoothstep(0.35, 1.1, length(q));
  if (uTone > 0.5) c = tone(c);
  vec3 o = uSurface * (1.0 - scene.a) + c;
  o += (hash(gl_FragCoord.xy + fract(uTime) * 91.0) - 0.5) * uGrain;
  outColor = vec4(o, 1.0);
}`
