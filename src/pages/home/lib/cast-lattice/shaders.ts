import { HALF, LEAN, RADIUS } from "./lattice"

// GLSL numbers need a point.
const f = (n: number) => n.toFixed(4)

// The swell without a pointer: a band LIFT pixels high and SPREAD wide
// crossing the canvas from left to right, never mirrored. It lights a few
// picked cells, each whole while the band's middle passes it and above a
// height of its own, so they come and go one by one.
export const SWELL_SPREAD = RADIUS
const SWELL_LIFT = 10
const SWELL_DENSITY = 0.04

// Each instance is a cell's prism, lifted and leaned by the pointer's
// springs (aPress) and by the swell, then seen from straight above the
// canvas's center: at z = 0 one unit is one CSS pixel, so the lattice at
// rest lies where the static image's does.
export const VERTEX_SHADER = `#version 300 es
layout(location=0) in vec4 aVertex;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec4 aCell;
layout(location=3) in vec4 aPress;
uniform vec2 uSize;
uniform float uDistance;
uniform vec2 uSwell;
out vec3 vNormal;
out vec3 vLocal;
out float vCrest;
void main() {
  float d = (aCell.x - uSwell.x) / ${f(SWELL_SPREAD)};
  float near = exp(-d * d) * uSwell.y;
  float lift = aPress.x + ${f(SWELL_LIFT)} * near;
  vec2 lean = aPress.yz + vec2(${f((2 * LEAN * SWELL_LIFT) / SWELL_SPREAD)} * d * near, 0.);
  vCrest = max(aPress.w, aCell.z < ${f(SWELL_DENSITY)} ? smoothstep(0., .06, near - .5 - .4 * aCell.w) : 0.);
  vec3 n = normalize(vec3(lean, 1.));
  mat3 k = mat3(0., 0., -n.x, 0., 0., -n.y, n.x, n.y, 0.);
  mat3 turn = mat3(1.) + k + k * k / (1. + n.z);
  vec3 p = turn * aVertex.xyz + vec3(aCell.xy, lift);
  vNormal = turn * aNormal;
  vLocal = vec3(aVertex.xy / ${f(HALF)}, aVertex.w);
  float depth = uDistance - p.z;
  vec2 c = (p.xy / uSize - .5) * 2. * uDistance;
  gl_Position = vec4(c.x, -c.y, (uDistance * depth - uDistance * uDistance + 4096.) / 64., depth);
}`

// Flat Lambert under a raking key light (uLight); a face's color moves from
// `surface` by the theme's step between `surface` and `surface-raised`, so
// tops at rest are the page itself and faces toward the light are lighter.
// No PBR, no environment. The rim of each prism is a half-pixel line of
// `outline-muted`, so two neighbors draw the static image's one-pixel line;
// where the rim light from the other side (uRim) catches an edge, it glints
// `outline`. Rust grows from the center of a crest's prism to its rim, from
// a third of it, so no specks: always solid and lit, never see-through.
export const FRAGMENT_SHADER = `#version 300 es
precision mediump float;
in vec3 vNormal;
in vec3 vLocal;
in float vCrest;
uniform vec3 uLight;
uniform vec3 uRim;
uniform vec3 uSurface;
uniform vec3 uStep;
uniform vec3 uEdge;
uniform vec3 uGlint;
uniform vec3 uCrest;
uniform float uLine;
out vec4 color;
void main() {
  vec3 n = normalize(vNormal);
  float light = max(dot(n, uLight), 0.);
  float rim = max(dot(n, uRim), 0.);
  vec3 face = uSurface + uStep * (light - uLight.z) * 1.5;
  vec3 edge = mix(uEdge, uGlint, rim * rim * rim * rim * .8);
  vec3 crest = uCrest * (.62 + .5 * light);
  float l = abs(vLocal.x) + abs(vLocal.y);
  float px = length(vec2(dFdx(l), dFdy(l)));
  if (vLocal.z > .5) {
    face = vCrest > .96 ? crest : mix(face, edge, .5);
  } else {
    float rust = vCrest > .02 ? .42 + .62 * vCrest : 0.;
    face = mix(face, crest, clamp((rust - l) / px, 0., 1.));
    face = mix(face, edge, clamp(uLine + .5 - (1. - l) / px, 0., 1.));
  }
  color = vec4(face, 1.);
}`
