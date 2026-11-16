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

// Thread attribute locations: the point, the points before and after it
// (the same buffer at three offsets) and the static info (u, side, thread).
export const T_POINT = 0
export const T_PREV = 1
export const T_NEXT = 2
export const T_INFO = 3

// Text boxes the threads fade in, at most (vec4 uniforms).
export const MASKS = 12

// The dust. A block's particles are placed by the block's matrix, lit by
// the key light and a rim; before the gather they are scattered over the
// screen around the block and fly in at a time of their own (`aSeed.x`),
// warm while they fly. A far node's (after the blocks) are placed by its
// row in `uNodes`: position and size, then heat and turn. Its heat is the
// light of what landed on it; the blocks show theirs faintly (#185 blows
// their dust off instead).
export const DUST_VERTEX = /* glsl */ `#version 300 es
layout(location = ${A_HOME}) in vec3 aHome;
layout(location = ${A_NORMAL}) in vec3 aNormal;
layout(location = ${A_NODE}) in float aNode;
layout(location = ${A_SEED}) in vec4 aSeed;
uniform mat4 uViewProj;
uniform mat4 uBlock[${BLOCKS}];
uniform float uForm[${BLOCKS}];
uniform highp sampler2D uNodes;
uniform float uTime, uScale, uSizeK, uMinSize;
uniform vec3 uKey, uSteel, uRim, uFlash;
out vec3 vColor;
mat3 turn(float ax, float ay) {
  float cx = cos(ax), sx = sin(ax), cy = cos(ay), sy = sin(ay);
  return mat3(cy, 0.0, -sy, 0.0, 1.0, 0.0, sy, 0.0, cy)
    * mat3(1.0, 0.0, 0.0, 0.0, cx, sx, 0.0, -sx, cx);
}
void main() {
  int id = int(aNode + 0.5);
  float lit = length(aNormal);
  vec3 normal = aNormal / max(lit, 1e-4);
  vec4 state = texelFetch(uNodes, ivec2(id, 1), 0);
  vec3 p, n;
  float scale, flash, size;
  if (id < ${BLOCKS}) {
    mat4 m = uBlock[id];
    scale = length(m[0].xyz);
    vec3 formed = (m * vec4(aHome, 1.0)).xyz;
    n = normalize(mat3(m) * normal);
    float f = smoothstep(aSeed.x * 0.55, aSeed.x * 0.55 + 0.45, uForm[id]);
    vec3 drift = vec3(sin(uTime * 0.31 + aSeed.x * 40.0),
      cos(uTime * 0.27 + aSeed.y * 31.0), 0.0) * 0.7;
    vec3 scatter = m[3].xyz + (aSeed.yzw - 0.5) * vec3(26.0, 15.0, 8.0)
      + drift;
    p = mix(scatter, formed, f);
    flash = (1.0 - f) * f * 2.0 + state.x * 0.12;
    size = 0.026 * uSizeK;
  } else {
    vec4 at = texelFetch(uNodes, ivec2(id, 0), 0);
    mat3 r = turn(state.y, state.z);
    p = at.xyz + r * aHome * at.w;
    n = r * normal;
    scale = at.w;
    flash = state.x * 0.9;
    size = 0.085;
  }
  vec4 clip = uViewProj * vec4(p, 1.0);
  gl_Position = clip;
  size *= scale * (0.75 + 0.5 * aSeed.z);
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

// The threads: one ribbon of triangles facing the screen, its points
// shared between segments. Each vertex moves across its thread by half
// the width in pixels (never under 1 device pixel) and a pixel more, which
// the fragment shader fades: smooth edges without MSAA. Per thread, in
// `uEdges`: width (world units), how visible, length; then the head of
// what runs on it (u, or -1, and its direction times its brightness).
export const THREAD_VERTEX = /* glsl */ `#version 300 es
layout(location = ${T_POINT}) in vec4 aPoint;
layout(location = ${T_PREV}) in vec4 aPrev;
layout(location = ${T_NEXT}) in vec4 aNext;
layout(location = ${T_INFO}) in vec3 aInfo;
uniform mat4 uViewProj;
uniform highp sampler2D uEdges;
uniform vec2 uRes;
uniform float uDpr, uFocal;
out float vSide, vHeat, vAlpha, vDepth, vU, vLength;
out vec2 vHead;
void main() {
  int e = int(aInfo.z + 0.5);
  vec4 thread = texelFetch(uEdges, ivec2(e, 0), 0);
  vec4 c = uViewProj * vec4(aPoint.xyz, 1.0);
  vec4 p0 = uViewProj * vec4(aPrev.xyz, 1.0);
  vec4 p1 = uViewProj * vec4(aNext.xyz, 1.0);
  vec2 dir = p1.xy / p1.w * 0.5 * uRes - p0.xy / p0.w * 0.5 * uRes;
  float l = length(dir);
  dir = l > 1e-4 ? dir / l : vec2(1.0, 0.0);
  vec2 across = vec2(-dir.y, dir.x);
  float px = thread.x * uFocal / c.w;
  float width = max(px, uDpr);
  float half_ = width * 0.5 + uDpr;
  c.xy += across * aInfo.y * half_ / (0.5 * uRes) * c.w;
  gl_Position = c;
  vSide = aInfo.y * half_ / (width * 0.5);
  vHeat = aPoint.w;
  vU = aInfo.x;
  vLength = thread.z;
  vHead = texelFetch(uEdges, ivec2(e, 1), 0).xy;
  vAlpha = thread.y * clamp(px / width, 0.3, 1.0);
  vDepth = c.w;
}`

// The dark theme's heat: from nothing through rust to white hot (linear).
const HEAT = /* glsl */ `
vec3 heatRamp(float t) {
  t = clamp(t, 0.0, 1.25);
  vec3 c = mix(vec3(0.0), vec3(0.28, 0.02, 0.008), smoothstep(0.0, 0.25, t));
  c = mix(c, vec3(0.62, 0.07, 0.03), smoothstep(0.2, 0.5, t));
  c = mix(c, vec3(1.0, 0.30, 0.06), smoothstep(0.45, 0.8, t));
  return mix(c, vec3(1.0, 0.78, 0.45), smoothstep(0.82, 1.15, t));
}`

// A thread's pixel. What runs on it is an impulse: a hot head and a tail
// that cools to rust behind it, no bead. In text boxes (`uMask`, device
// pixels from the bottom left) it fades out, once `uMaskK` is up. Dark:
// cold steel and the heat ramp, added to the scene (alpha 0, so the
// finish adds it over the page). Light: `outline` warming to `primary`
// at the same coverage, blended over (premultiplied): grey to red, never
// a pale pink.
export const THREAD_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
uniform vec4 uMask[${MASKS}];
uniform float uMaskK, uDpr, uTone, uDark, uLineAlpha;
uniform vec3 uLine, uPrimary;
in float vSide, vHeat, vAlpha, vDepth, vU, vLength;
in vec2 vHead;
out vec4 outColor;
${TONE}
${HEAT}
void main() {
  float cover = (1.0 - smoothstep(0.45, 1.6, abs(vSide))) * vAlpha;
  cover *= clamp(1.0 - (vDepth - 27.0) / 26.0, 0.22, 1.0);
  float masked = 1.0;
  for (int i = 0; i < ${MASKS}; i++) {
    vec4 r = uMask[i];
    if (r.z < 0.0) continue;
    vec2 q = max(r.xy - gl_FragCoord.xy, gl_FragCoord.xy - r.zw);
    masked = min(masked, smoothstep(-6.0 * uDpr, 44.0 * uDpr, max(q.x, q.y)));
  }
  cover *= mix(1.0, masked, uMaskK);
  float h = min(vHeat, 1.15);
  float pulse = 0.0;
  float behind = 0.0;
  if (vHead.x > -0.5) {
    float amp = abs(vHead.y);
    behind = (vHead.x - vU) * sign(vHead.y) * vLength;
    pulse = smoothstep(-0.05, 0.0, behind)
      * exp(-max(behind, 0.0) / (0.28 + 0.3 * amp)) * amp;
  }
  if (uDark > 0.5) {
    vec3 c = uLine * (1.0 - smoothstep(0.08, 0.45, h))
      + heatRamp(h) * pow(max(h, 0.0), 1.25) * 4.0;
    c += mix(vec3(0.62, 0.07, 0.03), vec3(1.0, 0.82, 0.62),
      exp(-max(behind, 0.0) / 0.07)) * pulse * 3.2;
    c *= cover;
    outColor = vec4(uTone > 0.5 ? tone(c) : c, 0.0);
  } else {
    float hot = clamp(max(smoothstep(0.1, 0.6, h), pulse), 0.0, 1.0);
    vec3 c = mix(uLine, uPrimary, hot);
    float a = cover * mix(uLineAlpha, 1.0, hot);
    outColor = vec4((uTone > 0.5 ? tone(c) : c) * a, a);
  }
}`

// One triangle over the screen.
export const FINISH_VERTEX = /* glsl */ `#version 300 es
out vec2 vUv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`

// The finish: the scene and its glow over the page. Where it drew nothing
// (alpha 0) the page's `surface` shows as is, so the canvas never differs
// from the page around it; light added there (the dark theme's threads and
// glow) adds to the page. Tone mapping takes what is partly covered (the
// light theme's threads) by its own color, not by what the cover left of
// it. The vignette darkens the scene only, toward the corners; the grain
// is the spike's.
export const FINISH_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D uScene, uGlow;
uniform vec3 uSurface;
uniform vec2 uSize;
uniform float uTone, uVignette, uGrain, uTime, uGlowK;
in vec2 vUv;
out vec4 outColor;
${TONE}
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}
void main() {
  vec4 scene = texture(uScene, vUv);
  vec3 c = scene.rgb + texture(uGlow, vUv).rgb * uGlowK;
  vec2 q = vUv - 0.5;
  q.x *= uSize.x / uSize.y;
  c *= 1.0 - 0.45 * uVignette * smoothstep(0.35, 1.1, length(q));
  if (uTone > 0.5) {
    c = scene.a > 0.004 ? tone(c / scene.a) * scene.a : tone(c);
  }
  vec3 o = uSurface * (1.0 - scene.a) + c;
  o += (hash(gl_FragCoord.xy + fract(uTime) * 91.0) - 0.5) * uGrain;
  outColor = vec4(o, 1.0);
}`

// The glow (dark theme): the scene's light over 1 at a quarter of its size
// (four bilinear taps cover each 4 × 4 block), then blurred across and
// down in two passes (nine taps as five), added in the finish.
export const GLOW_DOWN_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D uScene;
uniform vec2 uTexel;
in vec2 vUv;
out vec4 outColor;
void main() {
  vec3 c = texture(uScene, vUv + uTexel * vec2(-1.0, -1.0)).rgb
    + texture(uScene, vUv + uTexel * vec2(1.0, -1.0)).rgb
    + texture(uScene, vUv + uTexel * vec2(-1.0, 1.0)).rgb
    + texture(uScene, vUv + uTexel * vec2(1.0, 1.0)).rgb;
  c *= 0.25;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  outColor = vec4(c * smoothstep(0.75, 1.25, l), 1.0);
}`

export const GLOW_BLUR_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D uSource;
uniform vec2 uStep;
in vec2 vUv;
out vec4 outColor;
void main() {
  vec3 c = texture(uSource, vUv).rgb * 0.2270270;
  c += (texture(uSource, vUv + uStep * 1.3846154).rgb
    + texture(uSource, vUv - uStep * 1.3846154).rgb) * 0.3162162;
  c += (texture(uSource, vUv + uStep * 3.2307692).rgb
    + texture(uSource, vUv - uStep * 3.2307692).rgb) * 0.0702703;
  outColor = vec4(c, 1.0);
}`
