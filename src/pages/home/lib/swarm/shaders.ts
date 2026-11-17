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

// PROTOTYPE (spike/path-to-10): points of a chapter's figure per row of
// `uGlyph` (u, v in the figure's box, then its outward normal on screen).
export const GLYPH_W = 2048

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
// row in `uNodes`: position and size, then heat and turn.
// What lands on a block blows its dust off (`uSplash`: the direction it
// came from in the block's space and when, `uSplashA` how hard): a wave
// runs over the surface from there by the angle to it, the face it hit
// bursts out and flashes rust, then the dust settles. A far node puffs out
// by its heat instead. The pointer (`uPointer`, device pixels from the
// bottom left; `uPush`, how much) parts the dust on screen with a little
// swirl, wider on a wider viewport.
export const DUST_VERTEX = /* glsl */ `#version 300 es
layout(location = ${A_HOME}) in vec3 aHome;
layout(location = ${A_NORMAL}) in vec3 aNormal;
layout(location = ${A_NODE}) in float aNode;
layout(location = ${A_SEED}) in vec4 aSeed;
uniform mat4 uViewProj;
uniform mat4 uBlock[${BLOCKS}];
uniform float uForm[${BLOCKS}];
uniform vec4 uSplash[${BLOCKS}];
uniform float uSplashA[${BLOCKS}];
uniform highp sampler2D uNodes;
uniform float uTime, uScale, uSizeK, uDpr, uPush;
uniform vec2 uRes, uPointer;
uniform vec3 uKey, uSteel, uRim, uFlash;
// PROTOTYPE (spike/path-to-10): a chapter's block into its figure
// (uGlyphK, on row uGlyphRow of uGlyph, in the box uGlyphBox: world top
// left, then width and height), uGlyphShare of its dust; the dust blown
// off as the page is left (uLeave, 0 to 1).
uniform highp sampler2D uGlyph;
uniform vec4 uGlyphBox[${BLOCKS}];
uniform float uGlyphK[${BLOCKS}];
uniform float uGlyphRow[${BLOCKS}];
uniform float uGlyphShare, uGlyphPx, uLeave, uViewH;
out vec3 vColor;
mat3 turn(float ax, float ay) {
  float cx = cos(ax), sx = sin(ax), cy = cos(ay), sy = sin(ay);
  return mat3(cy, 0.0, -sy, 0.0, 1.0, 0.0, sy, 0.0, cy)
    * mat3(1.0, 0.0, 0.0, 0.0, cx, sx, 0.0, -sx, cx);
}
void main() {
  int id = int(aNode + 0.5);
  float lit = length(aNormal);
  float litK = lit;
  vec3 normal = aNormal / max(lit, 1e-4);
  vec3 home = aHome;
  vec3 p, n;
  float scale, size;
  float flash = 0.0;
  if (id < ${BLOCKS}) {
    mat4 m = uBlock[id];
    scale = length(m[0].xyz);
    float a = uSplashA[id];
    float age = uTime - uSplash[id].w;
    if (a > 0.0 && age > 0.0 && age < 4.0) {
      float angle = acos(clamp(dot(normalize(aHome), uSplash[id].xyz),
        -1.0, 1.0));
      float front = 2.0 * age;
      float wave = exp(-age * 1.3) * exp(-(angle - front) * (angle - front)
        * 5.0);
      float burst = exp(-age * 3.2) * exp(-angle * angle * 2.2);
      home += normal * a * (0.16 * wave + 0.9 * burst * (0.3 + aSeed.x))
        + (aSeed.yzw - 0.5) * a * burst * 0.9;
      flash = a * (0.7 * wave + burst * (0.6 + 0.8 * aSeed.y));
    }
    vec3 formed = (m * vec4(home, 1.0)).xyz;
    n = normalize(mat3(m) * normal);
    float f = smoothstep(aSeed.x * 0.55, aSeed.x * 0.55 + 0.45, uForm[id]);
    vec3 drift = vec3(sin(uTime * 0.31 + aSeed.x * 40.0),
      cos(uTime * 0.27 + aSeed.y * 31.0), 0.0) * 0.7;
    vec3 scatter = m[3].xyz + (aSeed.yzw - 0.5) * vec3(26.0, 15.0, 8.0)
      + drift;
    p = mix(scatter, formed, f);
    flash += (1.0 - f) * f * 2.0;
    float gk = uGlyphK[id];
    if (gk > 0.0 && aSeed.z < uGlyphShare) {
      vec4 g = texelFetch(uGlyph,
        ivec2(int(aSeed.y * ${GLYPH_W - 1}.0), int(uGlyphRow[id] + 0.5)), 0);
      vec4 b = uGlyphBox[id];
      vec3 target = vec3(b.x + g.x * b.z, b.y + g.y * b.w, 0.0);
      target.xy += (vec2(aSeed.w, fract(aSeed.x * 7.13)) - 0.5) * uGlyphPx
        * 2.5;
      target.xy += vec2(g.z, -g.w) * uGlyphPx * (0.5 + 2.5 * aSeed.w);
      target.z = (aSeed.x - 0.5) * uGlyphPx * 8.0;
      float m = smoothstep(aSeed.x * 0.45, aSeed.x * 0.45 + 0.55, gk);
      p = mix(p, target, m);
      n = normalize(mix(n, normalize(vec3(g.z, -g.w, 1.6)), m));
      litK = mix(litK, 1.0, m);
      flash += m * (1.0 - m) * 1.6;
    }
    size = 0.026 * uSizeK;
  } else {
    vec4 at = texelFetch(uNodes, ivec2(id, 0), 0);
    vec4 state = texelFetch(uNodes, ivec2(id, 1), 0);
    mat3 r = turn(state.y, state.z);
    float heat = state.x;
    home += normal * heat * (0.4 + 1.2 * aSeed.x)
      + (aSeed.yzw - 0.5) * heat * 1.1;
    p = at.xyz + r * home * at.w;
    n = r * normal;
    scale = at.w;
    flash = heat * 0.9;
    size = 0.085;
  }
  if (uLeave > 0.0) {
    vec3 dir = normalize(vec3((aSeed.yz - 0.5) * 2.0, aSeed.w - 0.35)
      + n * 0.7);
    float e = uLeave * uLeave;
    p += dir * e * uViewH * (0.12 + 0.4 * aSeed.x);
    flash += uLeave * (1.0 - uLeave) * 3.0 * (0.4 + aSeed.y);
  }
  vec4 clip = uViewProj * vec4(p, 1.0);
  if (uPush > 0.003) {
    vec2 d = (clip.xy / clip.w * 0.5 + 0.5) * uRes - uPointer;
    float l = length(d);
    float wide = clamp(uRes.x / (1440.0 * uDpr), 0.45, 1.0);
    float r0 = 120.0 * uDpr * wide;
    float push = uPush * exp(-l * l / (r0 * r0));
    if (push > 0.003) {
      vec2 dir = l > 0.001 ? d / l : vec2(1.0, 0.0);
      dir = normalize(dir + vec2(-dir.y, dir.x) * (aSeed.y - 0.5) * 1.4);
      p.xy += dir * push * (45.0 + 70.0 * aSeed.z) * wide * uDpr
        * (clip.w / uScale);
      p.z += push * (aSeed.w - 0.5) * 2.0 * scale;
      clip = uViewProj * vec4(p, 1.0);
    }
  }
  gl_Position = clip;
  size *= scale * (0.75 + 0.5 * aSeed.z);
  gl_PointSize = max(size * uScale / clip.w, uDpr)
    * (1.0 - smoothstep(0.55, 1.0, uLeave));
  float lambert = max(dot(n, uKey), 0.0);
  float rim = pow(1.0 - abs(n.z), 3.0);
  vec3 color = uSteel * (0.1 + 0.72 * lambert) * litK
    + uRim * rim * 0.32 * litK;
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
uniform float uMaskK, uDpr, uTone, uDark, uLineAlpha, uFade;
uniform vec3 uLine, uPrimary;
in float vSide, vHeat, vAlpha, vDepth, vU, vLength;
in vec2 vHead;
out vec4 outColor;
${TONE}
${HEAT}
void main() {
  float cover = (1.0 - smoothstep(0.45, 1.6, abs(vSide))) * vAlpha;
  cover *= clamp(1.0 - (vDepth - 27.0) / 26.0, 0.22, 1.0) * uFade;
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
