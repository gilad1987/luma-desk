// @ts-nocheck
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/* ====================================================================
   HELPERS
==================================================================== */
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t;
const D2R = Math.PI / 180, V3 = THREE.Vector3;
const deep = o => JSON.parse(JSON.stringify(o));
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
function hsv(h, s, v) { const i = Math.floor(h * 6), f = h * 6 - i, p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s); return [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]][((i % 6) + 6) % 6]; }
function rgb2hsv(r, g, b) { const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0; if (d) { if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h /= 6; if (h < 0) h += 1; } return [h, mx ? d / mx : 0, mx]; }
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
let toastT; function toast(m) { const t = $('#toast'); t.textContent = m; t.style.display = 'block'; clearTimeout(toastT); toastT = setTimeout(() => t.style.display = 'none', 1800); }

/* ====================================================================
   VENUE / RIG DEFINITION
==================================================================== */
const DECK = 1.8;
const STAGE = { x0: -23, x1: 23, z0: -21, z1: 0.6 };
const SCREEN = { z: -20.2, x0: -17.5, x1: 17.5, y0: DECK + 1, y1: DECK + 14 };

const ATTR = {
  dim: { label: 'Dimmer', min: 0, max: 100, def: 0, unit: '%', feat: 'dim' },
  pan: { label: 'Pan', min: -270, max: 270, def: 0, unit: '°', feat: 'pos' },
  tilt: { label: 'Tilt', min: -135, max: 135, def: 0, unit: '°', feat: 'pos' },
  r: { label: 'Red', min: 0, max: 100, def: 100, unit: '%', feat: 'color' },
  g: { label: 'Green', min: 0, max: 100, def: 100, unit: '%', feat: 'color' },
  b: { label: 'Blue', min: 0, max: 100, def: 100, unit: '%', feat: 'color' },
  gobo: { label: 'Gobo', min: 0, max: 7, def: 0, unit: '', feat: 'gobo', step: 1 },
  grot: { label: 'Gobo Rot', min: -100, max: 100, def: 0, unit: '', feat: 'gobo' },
  zoom: { label: 'Zoom', min: 1.5, max: 70, def: 20, unit: '°', feat: 'beam' },
  strobe: { label: 'Shutter', min: 0, max: 100, def: 0, unit: '', feat: 'beam' },
};
const FEATS = [['dim', 'Dimmer'], ['pos', 'Position'], ['gobo', 'Gobo'], ['color', 'Color'], ['beam', 'Beam'], ['fx', 'Phaser']];
const FEAT_ATTRS = { dim: ['dim'], pos: ['pan', 'tilt'], gobo: ['gobo', 'grot'], color: ['r', 'g', 'b'], beam: ['zoom', 'strobe'] };
const MOVER = ['dim', 'pan', 'tilt', 'r', 'g', 'b', 'gobo', 'grot', 'zoom', 'strobe'];
// model: the procedural 3D builder in BUILD (each one copies a real product, see the README rig table).
// soft: beam edge softness (higher = softer). glowK: lens-glow size factor. tiltOnly: a moving bar with tilt but no pan.
const TYPES = {
  spot: { name: 'Spot', model: 'forte', attrs: MOVER, zr: [7, 42], z0: 16, power: 1.0, moving: true, shape: 'mh', size: .72 },
  beam: { name: 'Beam', model: 'megapointe', attrs: MOVER, zr: [1.5, 6], z0: 2.6, power: 1.2, moving: true, shape: 'mh', size: .58 },
  wash: { name: 'Wash', model: 'spiider', attrs: ['dim', 'pan', 'tilt', 'r', 'g', 'b', 'zoom', 'strobe'], zr: [10, 60], z0: 26, power: .9, moving: true, shape: 'wash', size: .72, beamK: .5, soft: 2.6 },
  par: { name: 'LED Par', model: 'parfect', attrs: ['dim', 'r', 'g', 'b', 'strobe'], zr: [22, 22], z0: 22, power: .75, moving: false, shape: 'par', size: .5, soft: 2.6 },
  blinder: { name: 'Blinder 4L', model: 'strike4', attrs: ['dim', 'r', 'g', 'b'], zr: [60, 60], z0: 60, power: 1.0, moving: false, shape: 'blinder', size: .85, defColor: [100, 62, 30], beamK: .35, soft: 3, glowK: 2.2 },
  strobe: { name: 'Strobe', model: 'wtf', attrs: ['dim', 'strobe', 'r', 'g', 'b'], zr: [90, 90], z0: 90, power: .9, moving: false, shape: 'strobe', size: 1.1, defColor: [92, 95, 100], beamK: .3, soft: 3, glowK: 1.8 },
  bar: { name: 'LED Bar', model: 'tetra2', attrs: ['dim', 'tilt', 'r', 'g', 'b', 'zoom', 'strobe'], zr: [4, 45], z0: 20, power: .8, moving: true, tiltOnly: true, shape: 'bar', size: 1.3, beamK: .6, soft: 2.4, glowK: 1.3 },
  follow: { name: 'Follow Spot', model: 'forteFS', attrs: MOVER, zr: [5, 55], z0: 9, power: 1.1, moving: true, shape: 'mh', size: .72 },
  profile: { name: 'Profile', model: 's4', attrs: ['dim', 'r', 'g', 'b', 'gobo', 'grot'], zr: [26, 26], z0: 26, power: .8, moving: false, shape: 'profile', size: .6, defColor: [100, 86, 66], soft: 1.3 },
  screen: { name: 'LED Screen', attrs: ['dim', 'r', 'g', 'b', 'gobo', 'grot'], zr: [0, 0], z0: 0, power: 1, moving: false, shape: 'screen' },
};
const SCREEN_MODES = ['Solid', 'Gradient', 'Bars', 'Plasma', 'Pulse', 'Grid', 'Waves', 'Sparkle'];
const GOBO_NAMES = ['Open', 'Dots', 'Breakup', 'Star', 'Bars', 'Shards', 'Rings', 'Flower'];

const fixtures = [], FX = {};
function addFix(id, type, x, y, z, mount, fixed) {
  const f = { id, type, T: TYPES[type], pos: new V3(x, y, z), mount, fixed: fixed || null,
    vis: { pan: fixed ? fixed.pan : 0, tilt: fixed ? fixed.tilt : 0, gang: 0 }, out: {}, base: {} };
  fixtures.push(f); FX[id] = f; return f;
}
function row(start, n, type, x0, x1, y, z, mount, fixed) {
  const ids = [];
  for (let i = 0; i < n; i++) ids.push(addFix(start + i, type, n === 1 ? (x0 + x1) / 2 : lerp(x0, x1, i / (n - 1)), y, z, mount, fixed ? { ...fixed } : null).id);
  return ids;
}
const TR = { front: { z: 4, y: 20 }, t2: { z: -3.5, y: 21 }, t3: { z: -9, y: 21 }, t4: { z: -14, y: 21 }, back: { z: -18.6, y: 20 } };
const ROOF = 25.5, TOWX = 25.5, TOWZ = [4.8, -20.6];
row(101, 20, 'spot', -20, 20, TR.front.y - .75, TR.front.z, 'hang');
row(801, 16, 'blinder', -22, 22, TR.front.y - .6, TR.front.z + .5, 'hang', { pan: 0, tilt: 64 });
row(201, 30, 'beam', -21.5, 21.5, TR.t2.y - .7, TR.t2.z, 'hang');
row(301, 30, 'wash', -21.5, 21.5, TR.t3.y - .75, TR.t3.z, 'hang');
row(901, 20, 'strobe', -20, 20, TR.t3.y - .55, TR.t3.z + .5, 'hang', { pan: 0, tilt: 34 });
row(401, 20, 'spot', -20, 20, TR.t4.y - .75, TR.t4.z, 'hang');
row(501, 30, 'beam', -21.5, 21.5, TR.back.y - .7, TR.back.z, 'hang');
{ let id = 601; for (const sx of [-1, 1]) for (const z of [-3, -9, -15]) for (const y of [5, 9.5, 14, 18.5]) addFix(id++, 'wash', sx * 23.6, y, z, 'hang'); }
row(701, 40, 'beam', -21, 21, DECK + .32, -18, 'floor');
row(1001, 16, 'wash', -19, 19, DECK + .32, -.3, 'floor');
row(1101, 20, 'par', -16.5, 16.5, DECK + .22, -19.7, 'floor', { pan: 0, tilt: -12 });
addFix(2001, 'screen', 0, (SCREEN.y0 + SCREEN.y1) / 2, SCREEN.z, 'wall');
/* circular truss (outer beams + inner washes) */
const VEN = { X: 42, Z1: 58, STEPS: 30, RISE: .55, RUN: 1.15, WH: 7 }, UP3 = new V3(0, 1, 0), WALL_LIGHT = { l: null };
const TIER_N = new V3(0, 1, -VEN.RISE / VEN.RUN).normalize();
function terrH(x, z) {
  const zt = VEN.Z1 + VEN.STEPS * VEN.RUN, base = clamp((z - VEN.Z1) / VEN.RUN * VEN.RISE, 0, VEN.STEPS * VEN.RISE) + 4;
  const dx = Math.max(Math.abs(x) - VEN.X - 2, 0), dz = Math.max(z - zt, 0) + Math.max(-40 - z, 0) * .8, d = Math.hypot(dx, dz);
  if (d <= 0) return base;
  const nz = (Math.sin(x * .061) + Math.sin(z * .083 + 1.3) + Math.sin((x + z) * .047 + 2)) * 1.6 * Math.min(d / 12, 1);
  return base + Math.min(d * .55, 24) + (x < 0 ? Math.min(dx * .22, 12) : Math.min(dx * .16, 8)) + nz;
}
const RING = { x: 0, y: 17, z: -9, R: 9, r2: 5.2, y2: 18.2 };
for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, sa = Math.sin(a), ca = Math.cos(a);
  const f = addFix(1201 + i, 'beam', RING.x + RING.R * sa, RING.y - .72, RING.z + RING.R * ca, 'hang');
  f.pix = { p: new V3(RING.x + (RING.R + .3) * sa, RING.y - .05, RING.z + (RING.R + .3) * ca), tan: new V3(ca, 0, -sa), len: RING.R * Math.PI * 2 / 24 * 1.02 }; }
for (let i = 0; i < 12; i++) { const a = (i + .5) / 12 * Math.PI * 2, sa = Math.sin(a), ca = Math.cos(a);
  const f = addFix(1301 + i, 'wash', RING.x + RING.r2 * sa, RING.y2 - .78, RING.z + RING.r2 * ca, 'hang');
  f.pix = { p: new V3(RING.x + (RING.r2 + .28) * sa, RING.y2 - .05, RING.z + (RING.r2 + .28) * ca), tan: new V3(ca, 0, -sa), len: RING.r2 * Math.PI * 2 / 12 * 1.02 }; }
/* audience lighting: 12 crowd washes on the front truss + 2 delay towers in the crowd (3 washes each) */
row(1801, 12, 'wash', -21, 21, TR.front.y - .75, TR.front.z + 1.05, 'hang');
{ let id = 1813; for (const sx of [-1, 1]) for (const y of [5.5, 7.5, 9.5]) addFix(id++, 'wash', sx * 24, y, 33.6, 'floor'); }
const DELAYS = [[-24, 33], [24, 33]];
/* standing light towers on the deck: top beam + mid wash + vertical pixel strip */
const TOWERS = [...[4.5, 11, 18].flatMap(x => [[-x, -16.8, 7.5], [x, -16.8, 7.5]]), ...[11, 20.5].flatMap(x => [[-x, -1.8, 5], [x, -1.8, 5]])].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
TOWERS.forEach(([x, z, H], i) => {
  const b = addFix(1601 + i, 'beam', x, DECK + H + .55, z, 'floor');
  b.pix = { p: new V3(x, DECK + H / 2, z + .28), tan: new V3(0, 1, 0), len: H * .96 };
  addFix(1701 + i, 'wash', x, DECK + H * .55, z + .62, 'floor'); });
/* six angled trusses flown in the air (three per side, raked toward centre) */
const ANG = []; for (const sx of [-1, 1]) for (const z of [-5.5, -12, -17.5]) ANG.push({ a: new V3(sx * 24.4, 23.6, z), b: new V3(sx * 11.8, 14.2, z), z, sx });
{ const bl = [], sp = [];
  for (const t of ANG) { const d = t.b.clone().sub(t.a), L = d.length(), u = d.clone().normalize();
    for (let i = 0; i < 6; i++) { const q = (i + .5) / 6, p = t.a.clone().lerp(t.b, q);
      (t.z === -12 ? sp : bl).push({ x: p.x, y: p.y - .78, z: p.z, pix: { p: p.clone().add(new V3(0, -.27, .26)), tan: u, len: L / 6 * .96 } }); } }
  const put = (list, id0, type) => list.sort((a, b) => a.x - b.x || b.z - a.z).forEach((o, k) => { addFix(id0 + k, type, o.x, o.y, o.z, 'hang').pix = o.pix; });
  put(bl, 1401, 'beam'); put(sp, 1501, 'spot'); }
/* follow spots (Robe FORTE FS) on the front truss, in gaps between spots 101-120 that keep 1 m clear of the blinders; a RoboSpot station prop stands at FOH */
[2, 6, 12, 16].forEach((gap, k) => addFix(1901 + k, 'follow', -20 + 40 / 19 * (gap + .5), TR.front.y - .75, TR.front.z, 'hang'));
/* moving LED bars (Robe Tetra2) as footlights along the downstage edge; tilt only */
row(2101, 12, 'bar', -17, 17, DECK + .25 * TYPES.bar.size, STAGE.z1 - .3, 'floor');   // tilt axis .25 units above the base bottom
/* static profiles (ETC Source Four) on the side ladders, between the washes; each left unit has a mirror unit on the right */
{ let id = 2201; for (const sx of [-1, 1]) for (const z of [-3, -9, -15]) for (const y of [7.25, 11.75]) {
  const f = addFix(id++, 'profile', sx * 23.6, y, z, 'hang', { pan: 0, tilt: 0 }), a = aimAt(f, sx * 8, DECK + 1.5, z);
  f.fixed.pan = f.vis.pan = a.pan; f.fixed.tilt = f.vis.tilt = a.tilt; } }


const range = (a, b) => fixtures.filter(f => f.id >= a && f.id <= b).map(f => f.id);
const idsOfType = t => fixtures.filter(f => f.type === t).map(f => f.id);

/* ====================================================================
   POSITION MATH
==================================================================== */
function dirFrom(f, pan, tilt, out) {
  const p = pan * D2R, t = tilt * D2R, st = Math.sin(t);
  if (f.mount === 'floor') out.set(st * Math.sin(p), Math.cos(t), st * Math.cos(p));
  else out.set(st * Math.sin(p), -Math.cos(t), st * Math.cos(p));
  return out;
}
function aimAt(f, tx, ty, tz) {
  const d = new V3(tx, ty, tz).sub(f.pos).normalize();
  // tilt-only bar: no pan, so it can only sweep in its own Y-Z plane (dirFrom with pan 0); aim at the target's projection on that plane
  if (f.T.tiltOnly) return { pan: 0, tilt: +clamp(Math.atan2(d.z, f.mount === 'floor' ? d.y : -d.y) / D2R, -95, 95).toFixed(1) };
  let t = Math.acos(clamp(f.mount === 'floor' ? d.y : -d.y, -1, 1)) / D2R;
  let p = Math.atan2(d.x, d.z) / D2R;
  if (p > 90) { p -= 180; t = -t; } else if (p < -90) { p += 180; t = -t; }
  if (t < 0.5 && t > -0.5) p = 0;
  return { pan: +p.toFixed(1), tilt: +clamp(t, -135, 135).toFixed(1) };
}
const SXZ = [1.3, 1.28];
const BAND_PTS = [[0, -2.5], [-5, -4.5], [5, -4.5], [0, -10.3, .5], [6.5, -9.1, .5], [-7.4, -6.2], [3.2, -6.8]].map(p => [p[0] * SXZ[0], p[1] * SXZ[1], p[2]]);
const ringU = (f) => { const dx = f.pos.x - RING.x, dz = f.pos.z - RING.z, l = Math.hypot(dx, dz) || 1; return [dx / l, dz / l, Math.atan2(dx, dz)]; };
const POS = {
  ringDown: f => f.mount === 'floor' ? aimAt(f, f.pos.x, 40, f.pos.z) : aimAt(f, f.pos.x, DECK, f.pos.z),
  ringCone: f => aimAt(f, RING.x, f.mount === 'floor' ? 34 : DECK, RING.z),
  ringSun: f => { const [ux, uz] = ringU(f); return aimAt(f, f.pos.x + ux * 40, f.pos.y - 5, f.pos.z + uz * 40); },
  ringTwist: f => { const [, , a] = ringU(f), b = a + 2.3; return aimAt(f, RING.x + Math.sin(b) * RING.R * .9, f.mount === 'floor' ? 34 : DECK, RING.z + Math.cos(b) * RING.R * .9); },
  ringCrown: f => { const [ux, uz] = ringU(f); return aimAt(f, f.pos.x + ux * 22, 70, f.pos.z + uz * 22); },
  converge: f => aimAt(f, 0, 12, 42),
  wingFan: f => aimAt(f, f.pos.x * 3.2, 3, f.pos.z + 55),
  home: f => ({ pan: 0, tilt: 0 }),
  straight: f => ({ pan: 0, tilt: 0 }),
  center: f => aimAt(f, f.pos.x * .6, DECK, -9 + (f.pos.z + 9) * .25),
  singer: f => aimAt(f, 0, DECK + 1.5, -3.2),
  drums: f => aimAt(f, 0, DECK + 1.7, -13.2),
  down: f => aimAt(f, f.pos.x * .55, DECK, -1.2),
  audience: f => aimAt(f, clamp(f.pos.x * 1.6, -38, 38), 1.2, 30),
  fanAud: (f, k, n) => aimAt(f, lerp(-60, 60, n > 1 ? k / (n - 1) : .5), 1, 42),
  crowd: (f, k, n) => f.pos.z > 20 ? aimAt(f, f.pos.x * .45, 1.2, [18, 30, 46][k % 3]) : aimAt(f, lerp(-36, 36, n > 1 ? k / (n - 1) : .5), 1.2, 14 + (k % 3) * 12),
  skyFan: (f, k, n) => f.mount === 'floor' ? aimAt(f, lerp(-45, 45, n > 1 ? k / (n - 1) : .5), 60, f.pos.z + 12) : aimAt(f, lerp(-60, 60, n > 1 ? k / (n - 1) : .5), 30, 70),
  cross: f => aimAt(f, -f.pos.x * .9, DECK, f.pos.z < -12 ? -5 : -9),
  screen: f => aimAt(f, f.pos.x * .75, DECK + 5, SCREEN.z),
  vOut: f => f.mount === 'floor' ? aimAt(f, f.pos.x * 4, 40, f.pos.z) : aimAt(f, f.pos.x * 2.5, DECK, f.pos.z + 6),
  band: (f, k, n) => { const P = BAND_PTS[k % BAND_PTS.length]; return aimAt(f, P[0], DECK + 1.3 + (P[2] || 0), P[1]); },
  orch: (f, k, n) => { const sx = f.pos.x < 0 ? -1 : f.pos.x > 0 ? 1 : (k % 2 ? 1 : -1); return aimAt(f, sx * (16.4 + ((k % 3) - 1) * 2.1), DECK + 1.6, -11.6 + ((k % 3) - 1) * 2.4); },
  tunnel: (f) => aimAt(f, 0, f.mount === 'floor' ? 40 : DECK, 40),
};

/* ====================================================================
   THREE.JS SCENE
==================================================================== */
const performers = [];
const crowdU = { uBeat: { value: 0 }, uJump: { value: 1 } };
const canvas = $('#c'), ov = $('#ov'), ovx = ov.getContext('2d');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x01020a);
scene.fog = new THREE.FogExp2(0x05060c, 0.0022);
const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 1600);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = .08; controls.maxPolarAngle = Math.PI * .495;
const VIEWS = {
  foh: { p: [0, 16, 74], t: [0, 9, -8] }, fohMa: { p: [0, 3.2, 49.5], t: [0, 9.5, -8], fov: 60 }, front: { p: [0, 6, 28], t: [0, 10, -10] }, stage: { p: [4, DECK + 1.8, -5], t: [-2, 6, 30] },
  top: { p: [0, 86, -9], t: [0, 0, -9.1] }, side: { p: [62, 13, -8], t: [0, 9, -8] }, crowd: { p: [-5, 2.3, 16], t: [0, 13, -10] },
  band: { p: [2.5, 5, 10], t: [0, 3, -9] }, ring: { p: [0, DECK + 1.7, 3], t: [0, 17, -9.5] }, walls: { p: [0, 30, 96], t: [0, 14, -20] }, wide: { p: [-30, 40, 120], t: [0, 6, -5] }, aud: { p: [0, 15, 1], t: [0, 2, 46] }, drums: { p: [2.2, DECK + 3.2, -5.5], t: [0, DECK + 1, -12.4] }, valley: { p: [55, 34, 98], t: [-30, 8, -10] }, orch: { p: [0, 9, 2], t: [-15.5, 2.4, -12] },
};
// MA layout: FOH is the operator's standing eye at the control position in the audience, behind the console overlay;
// the scene's raised FOH riser and its desk are hidden there (they would show as a second, empty desk)
let curView = 'foh', fohRig = [];
function setView(v, instant) {
  const ma = v === 'foh' && document.body.classList.contains('ma'), V = VIEWS[ma ? 'fohMa' : v]; if (!V) return;
  curView = v; for (const m of fohRig) m.visible = !ma;
  // the wider lens of the MA control position keeps the whole roof above the console
  camera.fov = V.fov || 46; camera.updateProjectionMatrix();
  const from = { p: camera.position.clone(), t: controls.target.clone() }, to = { p: new V3(...V.p), t: new V3(...V.t) };
  if (instant) { camera.position.copy(to.p); controls.target.copy(to.t); controls.update(); return; }
  const t0 = performance.now();
  (function step() { const k = clamp((performance.now() - t0) / 700, 0, 1), e = k * k * (3 - 2 * k);
    camera.position.lerpVectors(from.p, to.p, e); controls.target.lerpVectors(from.t, to.t, e); if (k < 1) requestAnimationFrame(step); })();
  $$('[data-view]').forEach(b => b.classList.toggle('on', b.dataset.view === v));
}
setView('foh', true);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), .5, .45, .85);
composer.addPass(bloom);
composer.addPass(new OutputPass());
let glowOn = true, lightsOn = true;

/* --- environment --- */
scene.add(new THREE.HemisphereLight(0x3a4466, 0x0a0806, 0.35));
const moon = new THREE.DirectionalLight(0x8ea0d0, 0.25); moon.position.set(-30, 50, 40); scene.add(moon);
{ // sky
  const g = new THREE.SphereGeometry(500, 32, 16);
  const m = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: `varying vec3 vP;void main(){vP=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec3 vP;void main(){float h=clamp(vP.y,0.,1.);vec3 c=mix(vec3(.035,.045,.09),vec3(.004,.006,.02),pow(h,.45))+vec3(.09,.05,.02)*pow(1.-h,10.);gl_FragColor=vec4(c,1.);}` });
  scene.add(new THREE.Mesh(g, m));
  const N = 2200, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { const u = Math.random() * Math.PI * 2, v = Math.acos(Math.random() * .92); const r = 480;
    pos.set([r * Math.sin(v) * Math.cos(u), r * Math.cos(v) + 10, r * Math.sin(v) * Math.sin(u)], i * 3); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xc8d2ff, size: 1.3, sizeAttenuation: false, fog: false, transparent: true, opacity: .8 })));
}
const matDark = new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: .9, metalness: .05 });
const deckTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d'); x.fillStyle = '#16161a'; x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 4000; i++) { x.fillStyle = `rgba(255,255,255,${Math.random() * .025})`; x.fillRect(Math.random() * 512, Math.random() * 512, 2, 2); }
  x.strokeStyle = '#08080a'; x.lineWidth = 3; for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(i * 128, 0); x.lineTo(i * 128, 512); x.stroke(); x.beginPath(); x.moveTo(0, i * 256); x.lineTo(512, i * 256); x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(12, 6); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; })();
const matDeck = new THREE.MeshStandardMaterial({ color: 0x5a5a60, map: deckTex, roughness: .55, metalness: .1 });
const matTruss = new THREE.MeshStandardMaterial({ color: 0x7a7e86, roughness: .35, metalness: .85 });
const matBlack = new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 1 });
const matStone = new THREE.MeshStandardMaterial({ color: 0x3b352c, roughness: 1, flatShading: true });
const matPerson = new THREE.MeshStandardMaterial({ color: 0x1b1b20, roughness: .85 });
const box = (w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); scene.add(m); return m; };
{ // ground + deck
  box(STAGE.x1 - STAGE.x0, DECK, STAGE.z1 - STAGE.z0, matDeck, 0, DECK / 2, (STAGE.z0 + STAGE.z1) / 2).receiveShadow = true;
  box(STAGE.x1 - STAGE.x0, DECK - .1, .05, matBlack, 0, (DECK - .1) / 2, STAGE.z1 + .03); // skirt
  box(STAGE.x1 - STAGE.x0 + .2, .08, .2, new THREE.MeshStandardMaterial({ color: 0x222226 }), 0, DECK + .04, STAGE.z1); // nosing
  box(60, 30, .5, matBlack, 0, 15, -21.6); // back wall
  // ===== Sultan's Pool, Jerusalem: flat pool floor, terraced slope, stone walls, Old City walls on the ridge =====
  const floorTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d'); x.fillStyle = '#5a5246'; x.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 9000; i++) { const v = 60 + Math.random() * 60; x.fillStyle = `rgba(${v},${v * .92},${v * .8},.25)`; x.fillRect(Math.random() * 512, Math.random() * 512, 2 + Math.random() * 3, 2 + Math.random() * 3); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(14, 14); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const poolFloor = new THREE.Mesh(new THREE.PlaneGeometry(VEN.X * 2, VEN.Z1 - STAGE.z0 + 10), new THREE.MeshStandardMaterial({ color: 0x8a8070, map: floorTex, roughness: .95 }));
  poolFloor.rotation.x = -Math.PI / 2; poolFloor.position.set(0, .01, (VEN.Z1 + STAGE.z0 - 10) / 2); poolFloor.receiveShadow = true; scene.add(poolFloor);
  // Jerusalem-stone texture, floodlit from below (night look, independent of stage lights)
  const stoneTex = (lit) => { const c = document.createElement('canvas'); c.width = 256; c.height = 256; const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 256, 0, 0); g.addColorStop(0, lit ? '#e8c48c' : '#6e5d48'); g.addColorStop(1, lit ? '#7a5a36' : '#3a3026'); x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    for (let r = 0; r < 16; r++) for (let k = 0; k < 6; k++) { const ox = (r % 2) * 21, v = Math.random() * .18; x.fillStyle = `rgba(0,0,0,${v})`; x.fillRect(k * 43 + ox, r * 16, 41, 14); }
    x.strokeStyle = 'rgba(30,20,10,.55)'; x.lineWidth = 2; for (let r = 0; r <= 16; r++) { x.beginPath(); x.moveTo(0, r * 16); x.lineTo(256, r * 16); x.stroke(); }
    for (let r = 0; r < 16; r++) for (let k = 0; k <= 6; k++) { const xx = k * 43 + (r % 2) * 21; x.beginPath(); x.moveTo(xx, r * 16); x.lineTo(xx, r * 16 + 16); x.stroke(); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t; };
  const stoneLit = stoneTex(true), stoneDim = stoneTex(false);
  const stoneMat = (tex, w, h, basic) => { const t = tex.clone(); t.needsUpdate = true; t.repeat.set(w / 8, h / 8);
    return basic ? new THREE.MeshBasicMaterial({ map: t, color: 0xb0a090, fog: true }) : new THREE.MeshStandardMaterial({ map: t, roughness: .95, color: 0xcfc3b0 }); };
  // pool retaining walls (left / right) — lit by the show
  for (const sx of [-1, 1]) { const L = VEN.Z1 - STAGE.z0 + 8, m = new THREE.Mesh(new THREE.BoxGeometry(2, VEN.WH, L), stoneMat(stoneDim, L, VEN.WH));
    m.position.set(sx * (VEN.X + 1), VEN.WH / 2, (VEN.Z1 + STAGE.z0) / 2); scene.add(m); }
  // terraced seating slope
  const stepMat = stoneMat(stoneDim, VEN.X * 2, 1.4);
  for (let k = 0; k < VEN.STEPS; k++) { const y = (k + 1) * VEN.RISE, z = VEN.Z1 + k * VEN.RUN;
    const m = new THREE.Mesh(new THREE.BoxGeometry(VEN.X * 2 + 4, y, VEN.RUN), stepMat); m.position.set(0, y / 2, z + VEN.RUN / 2); m.receiveShadow = true; scene.add(m); }
  // terrain: the Hinnom valley hills around the pool
  { const G = new THREE.PlaneGeometry(460, 460, 150, 150); G.rotateX(-Math.PI / 2); G.translate(0, 0, 20);
    const P = G.attributes.position, col = new Float32Array(P.count * 3);
    for (let i = 0; i < P.count; i++) { const x = P.getX(i), z = P.getZ(i), h = terrH(x, z), inside = Math.abs(x) < VEN.X + 2 && z > STAGE.z0 - 12 && z < VEN.Z1 + VEN.STEPS * VEN.RUN;
      P.setY(i, inside ? -.5 : h); const r = Math.random() * .03, ol = Math.random() < .25; col.set(ol ? [.07 + r, .085 + r, .05 + r] : [.11 + r, .095 + r, .075 + r], i * 3); }
    G.setAttribute('color', new THREE.BufferAttribute(col, 3)); G.computeVertexNormals();
    scene.add(new THREE.Mesh(G, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }))); }
  // Old City walls along the ridge, with towers, crenellations and the Tower of David citadel — floodlit warm
  { const crenG = new THREE.BoxGeometry(.9, 1.3, 2.3), crenM = new THREE.MeshBasicMaterial({ color: 0xc9a46c }), crenXf = [];
    const WALLS = [[[-58, -95], [-74, -50], [-82, -5], [-84, 40], [-74, 85], [-48, 118]], [[56, -95], [72, -52], [82, -8], [85, 38], [76, 84], [52, 118]]];
    for (const raw of WALLS) { const pts = raw.map(([x, z]) => new V3(x, terrH(x, z), z));
    for (let i = 0; i < pts.length - 1; i++) { const A = pts[i], B = pts[i + 1], L = Math.hypot(B.x - A.x, B.z - A.z), ang = Math.atan2(B.x - A.x, B.z - A.z);
      const n = Math.ceil(L / 6);
      for (let k = 0; k < n; k++) { const t0 = k / n, t1 = (k + 1) / n, x = lerp(A.x, B.x, (t0 + t1) / 2), z = lerp(A.z, B.z, (t0 + t1) / 2), base = Math.min(terrH(lerp(A.x, B.x, t0), lerp(A.z, B.z, t0)), terrH(lerp(A.x, B.x, t1), lerp(A.z, B.z, t1))) - 3, H = 14;
        const m = new THREE.Mesh(new THREE.BoxGeometry(2.4, H, L / n + .05), stoneMat(stoneLit, L / n, H, true)); m.position.set(x, base + H / 2, z); m.rotation.y = ang; scene.add(m);
        for (let c = 0; c < 3; c++) { const tt = lerp(t0, t1, (c + .5) / 3); crenXf.push([lerp(A.x, B.x, tt), base + H + .65, lerp(A.z, B.z, tt), ang]); } }
      if (i > 0) { const H = 20, base = A.y - 3, m = new THREE.Mesh(new THREE.BoxGeometry(8, H, 8), stoneMat(stoneLit, 8, H, true)); m.position.set(A.x, base + H / 2, A.z); m.rotation.y = ang; scene.add(m);
        for (const [dx, dz] of [[-3.4, -3.4], [3.4, -3.4], [-3.4, 3.4], [3.4, 3.4], [0, -3.4], [0, 3.4], [-3.4, 0], [3.4, 0]]) crenXf.push([A.x + dx, base + H + .65, A.z + dz, ang]); } }
    } // walls
    // right side: gatehouse with an arched gate facing the venue (Jaffa Gate style)
    { const gx = 83.5, gz = 15, gb = terrH(gx, gz) - 3, H = 22, gm = new THREE.Mesh(new THREE.BoxGeometry(11, H, 13), stoneMat(stoneLit, 11, H, true)); gm.position.set(gx, gb + H / 2, gz); scene.add(gm);
      const arch = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 7), new THREE.MeshBasicMaterial({ color: 0x0b0806 })); arch.position.set(gx - 5.52, gb + 3 + 3.5, gz); arch.rotation.y = -Math.PI / 2; scene.add(arch);
      const top = new THREE.Mesh(new THREE.CircleGeometry(2.1, 20, 0, Math.PI), arch.material); top.position.set(gx - 5.52, gb + 10, gz); top.rotation.y = -Math.PI / 2; scene.add(top);
      for (const [dx, dz] of [[-5, -6], [-5, -2], [-5, 2], [-5, 6], [5, -6], [5, 6], [0, -6], [0, 6]]) crenXf.push([gx + dx, gb + H + .65, gz + dz, Math.PI / 2]); }
    // right ridge, behind the wall: round tower with a conical roof + a dark dome (Mount Zion silhouette)
    { const tx = 104, tz = -28, tb = terrH(tx, tz) - 2, rt = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.6, 26, 20), stoneMat(stoneLit, 8, 26, true)); rt.position.set(tx, tb + 13, tz); scene.add(rt);
      for (let k = 0; k < 4; k++) { const tur = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 8, 10), rt.material); tur.position.set(tx + Math.cos(k * 1.57) * 4.4, tb + 22, tz + Math.sin(k * 1.57) * 4.4); scene.add(tur);
        const cap = new THREE.Mesh(new THREE.ConeGeometry(1.25, 2.6, 10), new THREE.MeshBasicMaterial({ color: 0x2b3238 })); cap.position.set(tur.position.x, tb + 27.3, tur.position.z); scene.add(cap); }
      const cone = new THREE.Mesh(new THREE.ConeGeometry(4.9, 9, 20), new THREE.MeshBasicMaterial({ color: 0x323b42 })); cone.position.set(tx, tb + 30.5, tz); scene.add(cone);
      const crossM = new THREE.MeshBasicMaterial({ color: 0xc9a46c }); const c1 = new THREE.Mesh(new THREE.BoxGeometry(.25, 2.2, .25), crossM); c1.position.set(tx, tb + 36, tz); scene.add(c1);
      const nave = new THREE.Mesh(new THREE.BoxGeometry(22, 12, 14), stoneMat(stoneLit, 22, 12, true)); nave.position.set(tx + 12, tb + 6, tz + 9); scene.add(nave);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(5.5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x2a3036 })); dome.position.set(tx + 14, tb + 12, tz + 9); scene.add(dome); }
    const im = new THREE.InstancedMesh(crenG, crenM, crenXf.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
    crenXf.forEach(([x, y, z, a], i) => { q.setFromAxisAngle(UP3, a); m4.compose(new V3(x, y, z), q, new V3(1, 1, 1)); im.setMatrixAt(i, m4); }); scene.add(im);
    // Tower of David (citadel + minaret)
    const cx = -70, cz = -62, cb = terrH(cx, cz) - 3;
    const keep = new THREE.Mesh(new THREE.BoxGeometry(16, 22, 16), stoneMat(stoneLit, 16, 22, true)); keep.position.set(cx, cb + 11, cz); scene.add(keep);
    const minM = stoneMat(stoneLit, 4, 20, true), mx_ = cx + 4, mz_ = cz + 5;
    const mn = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.1, 20, 16), minM); mn.position.set(mx_, cb + 32, mz_); scene.add(mn);
    const gal = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.7, .7, 16), crenM); gal.position.set(mx_, cb + 39, mz_); scene.add(gal);
    const up = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.6, 5, 16), minM); up.position.set(mx_, cb + 44.5, mz_); scene.add(up);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1.7, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), crenM); dome.position.set(mx_, cb + 47, mz_); scene.add(dome);
    const spire = new THREE.Mesh(new THREE.ConeGeometry(.25, 2.5, 8), crenM); spire.position.set(mx_, cb + 49.2, mz_); scene.add(spire);
    // floodlight glow at the foot of the walls
    const wl = new THREE.PointLight(0xffb060, 0, 140, 1.4); wl.position.set(-66, 30, -10); scene.add(wl); WALL_LIGHT.l = wl; }
  // city lights on the surrounding hills
  { const N = 2600, pos = new Float32Array(N * 3), col = new Float32Array(N * 3); let n = 0;
    for (let i = 0; i < N * 6 && n < N; i++) { const x = (Math.random() - .5) * 440, z = 20 + (Math.random() - .5) * 440;
      if (Math.abs(x) < VEN.X + 18 && z > -40 && z < VEN.Z1 + VEN.STEPS * VEN.RUN + 14) continue; if (Math.abs(x) > 55 && Math.abs(x) < 95 && z > -100 && z < 125) continue; if (x > 95 && x < 135 && z > -45 && z < 0) continue;
      const h = terrH(x, z); pos.set([x, h + 1 + Math.random() * 6, z], n * 3); const w = Math.random(); col.set(w < .7 ? [1, .72, .4] : [.85, .9, 1], n * 3); n++; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos.slice(0, n * 3), 3)); g.setAttribute('color', new THREE.BufferAttribute(col.slice(0, n * 3), 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: .85, fog: false }))); }
  // FOH riser
  fohRig = [box(8, 1.4, 4.5, matDark, 0, 4.3, 47), box(6.5, .9, .9, new THREE.MeshStandardMaterial({ color: 0x15151a }), 0, 5.45, 46)];
  { const cm = new THREE.MeshStandardMaterial({ color: 0x5c5f66, metalness: .8, roughness: .4 });  // crowd barricade
    for (let x = -36; x <= 36; x += 2.05) box(2, 1.25, .5, cm, x, .62, 6.2); }
}
{ // trusses
  const tubeG = new THREE.CylinderGeometry(.03, .03, 1, 6), chainM = new THREE.MeshBasicMaterial({ color: 0x2a2a2a });
  function truss(a, b, s = .42) {
    const A = new V3(...a), B = new V3(...b), d = B.clone().sub(A), L = d.length(), mid = A.clone().add(B).multiplyScalar(.5);
    const g = new THREE.Group(); g.position.copy(mid); g.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.normalize());
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const c = new THREE.Mesh(tubeG, matTruss); c.scale.set(1.4, L, 1.4); c.position.set(x * s / 2, 0, z * s / 2); g.add(c); }
    const n = Math.max(1, Math.round(L / s));
    for (let i = 0; i < n; i++) { const yy = -L / 2 + (i + .5) * L / n;
      for (const [x, z, rx, rz] of [[0, -1, 0, 1], [0, 1, 0, 1], [-1, 0, 1, 0], [1, 0, 1, 0]]) {
        const c = new THREE.Mesh(tubeG, matTruss); c.scale.set(.8, s * 1.41, .8); c.position.set(x * s / 2, yy, z * s / 2);
        if (rz) c.rotation.z = (i % 2 ? 1 : -1) * Math.PI / 4; if (rx) c.rotation.x = (i % 2 ? 1 : -1) * Math.PI / 4; g.add(c); } }
    scene.add(g); return g;
  }
  for (const k in TR) truss([-TOWX, TR[k].y, TR[k].z], [TOWX, TR[k].y, TR[k].z], .52);
  for (const x of [-TOWX, TOWX]) for (const z of TOWZ) truss([x, 0, z], [x, ROOF, z], .78);
  for (const x of [-TOWX, TOWX]) truss([x, 0, -8], [x, ROOF, -8], .78);
  for (const x of [-TOWX, TOWX]) truss([x, ROOF, TOWZ[0]], [x, ROOF, TOWZ[1]], .78);
  truss([-TOWX, ROOF, TOWZ[0]], [TOWX, ROOF, TOWZ[0]], .78); truss([-TOWX, ROOF, TOWZ[1]], [TOWX, ROOF, TOWZ[1]], .78); truss([-TOWX, ROOF, -8], [TOWX, ROOF, -8], .78);
  for (const sx of [-1, 1]) for (const z of [-3, -9, -15]) truss([sx * 23.6 + sx * .4, DECK, z], [sx * 23.6 + sx * .4, 19.5, z], .4);
  box(54, .3, 27, new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: .9 }), 0, ROOF + .7, -7.9); // roof
  function ringTruss(R, y, s) {   // box truss bent into a circle: 4 toroidal chords + instanced lacing
    for (const [dr, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const t = new THREE.Mesh(new THREE.TorusGeometry(R + dr * s / 2, .045, 6, 160), matTruss); t.rotation.x = Math.PI / 2; t.position.set(RING.x, y + dy * s / 2, RING.z); scene.add(t); }
    const n = Math.round(Math.PI * 2 * R / s), im = new THREE.InstancedMesh(tubeG, matTruss, n * 4), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new V3(.9, s * 1.41, .9), ps = new V3();
    let k = 0;
    for (let i = 0; i < n; i++) { const a = (i + .5) / n * Math.PI * 2, zig = (i % 2 ? 1 : -1) * Math.PI / 4;
      for (const [dr, dy, face] of [[-1, 0, 'v'], [1, 0, 'v'], [0, -1, 'h'], [0, 1, 'h']]) {
        const rr = R + dr * s / 2; ps.set(RING.x + Math.sin(a) * rr, y + dy * s / 2, RING.z + Math.cos(a) * rr);
        if (face === 'v') e.set(0, a, zig, 'YXZ'); else e.set(Math.PI / 2, a, zig, 'YXZ'); q.setFromEuler(e); m4.compose(ps, q, sc); im.setMatrixAt(k++, m4); } }
    scene.add(im);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + .26, c = new THREE.Mesh(tubeG, chainM); c.scale.set(.7, ROOF - y, .7); c.position.set(RING.x + Math.sin(a) * R, (ROOF + y) / 2, RING.z + Math.cos(a) * R); scene.add(c); }
  }
  ringTruss(RING.R, RING.y, .5); ringTruss(RING.r2, RING.y2, .4);
  for (const [x, z] of DELAYS) { truss([x, 0, z], [x, 11, z], .6); box(1.8, .1, 1.8, matTruss, x, .05, z); box(1.6, 1.4, 1.2, matDark, x, 11.2, z); }
  for (const [x, z, H] of TOWERS) { truss([x, DECK, z], [x, DECK + H, z], .46);
    box(1.3, .08, 1.3, matTruss, x, DECK + .04, z); box(.7, .06, .7, matTruss, x, DECK + H + .03, z);
    box(.5, .05, .5, matTruss, x, DECK + H * .55 - .45, z + .45); }
  for (const t of ANG) { truss(t.a.toArray(), t.b.toArray(), .44);
    for (const p of [t.a, t.b]) { const c = new THREE.Mesh(tubeG, chainM); c.scale.set(.7, ROOF - p.y, .7); c.position.set(p.x, (ROOF + p.y) / 2, p.z); scene.add(c); } }
  for (const k in TR) for (const x of [-16, -5.5, 5.5, 16]) { const c = new THREE.Mesh(tubeG, chainM); c.scale.set(.7, ROOF - TR[k].y, .7); c.position.set(x, (ROOF + TR[k].y) / 2, TR[k].z); scene.add(c); }
  // PA hangs + subs
  for (const sx of [-1, 1]) { for (const off of [0, 3.2]) { const g = new THREE.Group(); for (let i = 0; i < 16; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(1.4, .44, 1.2), matDark); m.position.y = -i * .46; m.rotation.x = i * .02; g.add(m);
      const grill = new THREE.Mesh(new THREE.PlaneGeometry(1.3, .36), new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: .95 })); grill.position.set(0, -i * .46, .61); grill.rotation.x = i * .02; g.add(grill); }
    g.position.set(sx * (29 + off), 21.5, 3 - off * .5); g.rotation.y = -sx * (.12 + off * .05); scene.add(g); }
    for (let i = 0; i < 4; i++) box(1.5, 1.2, 1.4, matDark, sx * (28 - i * 1.6), .6, 3.4); }
}
{ // backline, band & 20-piece orchestra
  const __n0 = scene.children.length;
  const kit = new THREE.MeshStandardMaterial({ color: 0x2a2a30, metalness: .6, roughness: .3 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x6b3416, roughness: .4, metalness: .1 });
  const woodD = new THREE.MeshStandardMaterial({ color: 0x3a1a0a, roughness: .4 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xc9a040, metalness: .9, roughness: .25 });
  const silver = new THREE.MeshStandardMaterial({ color: 0xb8bcc4, metalness: .9, roughness: .2 });
  const black = new THREE.MeshStandardMaterial({ color: 0x0a0a0b, roughness: .5 });
  const copper = new THREE.MeshStandardMaterial({ color: 0x9a5530, metalness: .8, roughness: .3 });
  const skin = new THREE.MeshStandardMaterial({ color: 0x7d5e4b, roughness: .75 });
  const cloth = [0x3a3a44, 0x4a4650, 0x2f2f37, 0x5a3e4a, 0x34404e].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: .85 }));
  const lampM = new THREE.MeshBasicMaterial({ color: 0xffd9a0 });
  const add = (geo, m, x, y, z, par, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); (par || scene).add(o); return o; };
  const BX = (w, h, d) => new THREE.BoxGeometry(w, h, d), CY = (r1, r2, h, s = 12) => new THREE.CylinderGeometry(r1, r2, h, s);
  // risers
  box(5, .5, 3.2, matDark, 0, DECK + .25, -9.5).userData.riser = 1;
  box(3.4, .5, 2.4, matDark, 6.5, DECK + .25, -8.5).userData.riser = 1;
  const ROWS = [{ z: -6.8, h: .25 }, { z: -9.1, h: .5 }, { z: -11.4, h: .75 }];
  for (const sx of [-1, 1]) for (const r of ROWS) box(8.4, r.h, 2.2, matDark, sx * 13.4, DECK + r.h / 2, r.z).userData.riser = 1;
  // drum kit — full-size, on the drum riser, facing the audience
  { const K = new THREE.Group(), shell = new THREE.MeshStandardMaterial({ color: 0x9a0f22, metalness: .7, roughness: .25 }), headM = new THREE.MeshStandardMaterial({ color: 0xece6da, roughness: .6 });
    const chrome = new THREE.MeshStandardMaterial({ color: 0xd8dce2, metalness: 1, roughness: .15 }), cym = new THREE.MeshStandardMaterial({ color: 0xd4a640, metalness: .95, roughness: .22, side: THREE.DoubleSide });
    const logo = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); x.fillStyle = '#ece6da'; x.fillRect(0, 0, 256, 256);
      x.strokeStyle = '#9a0f22'; x.lineWidth = 10; x.beginPath(); x.arc(128, 128, 100, 0, 7); x.stroke(); x.fillStyle = '#111'; x.font = 'bold 54px Inter, sans-serif'; x.textAlign = 'center'; x.fillText('LUMA', 128, 146);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    const drum = (r, d, x, y, z, rx = 0, rz = 0, front) => { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.set(rx, 0, rz);
      add(CY(r, r, d, 28), shell, 0, 0, 0, g); add(CY(r * 1.01, r * 1.01, .012, 28), headM, 0, d / 2, 0, g); add(CY(r * 1.03, r * 1.03, .02, 28), chrome, 0, -d / 2, 0, g);
      if (front) { const fh = new THREE.Mesh(new THREE.CircleGeometry(r * .99, 28), new THREE.MeshStandardMaterial({ map: logo, roughness: .5 })); fh.position.y = -d / 2 - .012; fh.rotation.x = Math.PI / 2; g.add(fh); }
      K.add(g); return g; };
    const stand = (x, z, h) => { add(CY(.012, .012, h, 6), chrome, x, h / 2, z, K); for (let i = 0; i < 3; i++) { const a2 = i * 2.1; add(CY(.008, .008, .4, 4), chrome, x + Math.sin(a2) * .15, .1, z + Math.cos(a2) * .15, K, Math.cos(a2) * .9, 0, -Math.sin(a2) * .9); } };
    const cymbal = (x, y, z, r, tilt = .15, tz = 0) => { stand(x, z, y); const c = new THREE.Mesh(new THREE.CylinderGeometry(r * .12, r, .03, 32, 1, true), cym); c.position.set(x, y, z); c.rotation.set(tilt, 0, tz); K.add(c); };
    drum(.29, .48, 0, .3, .05, Math.PI / 2, 0, true);                // kick, logo head toward the audience
    drum(.18, .14, -.4, .66, -.42, -.18, -.12);                        // snare
    drum(.15, .2, -.16, .98, -.12, -.5, .12); drum(.17, .22, .2, .98, -.12, -.5, -.12);   // rack toms
    drum(.21, .4, .55, .45, -.5); drum(.23, .42, .7, .46, -.06);     // floor toms
    for (const [x, z] of [[.48, -.62], [.62, -.62], [.84, -.2], [.84, .1]]) add(CY(.012, .012, .3, 4), chrome, x, .15, z, K);
    stand(-.72, -.5, .95); for (const dy of [0, .025]) { const h = new THREE.Mesh(new THREE.CylinderGeometry(.03, .18, .02, 28), cym); h.position.set(-.72, .95 + dy, -.5); K.add(h); }   // hi-hat
    cymbal(-.62, 1.42, .02, .23, .3, .25); cymbal(.42, 1.5, .08, .25, .3, -.2); cymbal(.92, 1.15, -.32, .3, .15, -.25); cymbal(-1.0, 1.28, -.2, .22, .25, .45);  // crashes, ride, china
    add(CY(.18, .16, .08, 16), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: .7 }), 0, .5, -.82, K); add(CY(.03, .03, .45, 6), chrome, 0, .23, -.82, K);  // throne
    const shield = new THREE.MeshStandardMaterial({ color: 0xbfd6ff, transparent: true, opacity: .1, roughness: .05, metalness: .2, side: THREE.DoubleSide, depthWrite: false });
    for (let i = -2; i <= 2; i++) { const a2 = i * .32, pnl = new THREE.Mesh(new THREE.PlaneGeometry(.62, 1.55), shield); pnl.position.set(Math.sin(a2) * 1.25, .78, .55 + Math.cos(a2) * .25 - .25 * Math.abs(i) * .5); pnl.rotation.y = a2; K.add(pnl); }
    K.scale.setScalar(1.15); K.position.set(0, DECK + .5, -9.55); scene.add(K); }
  // drum riser front with LED edge
  { const led = new THREE.Mesh(new THREE.BoxGeometry(5, .05, .05), new THREE.MeshBasicMaterial({ color: 0x8a1428, toneMapped: false })); led.position.set(0, DECK + .48, -7.88); scene.add(led); led.userData.riser = 1; }
  // amps
  for (const x of [-6.5, -3.5, 3.5]) box(1.2, 1.4, .6, matDark, x, DECK + .7, -12.2);
  for (const x of [-6, -2, 2, 6]) { const w = box(1, .5, .7, matDark, x, DECK + .25, -.4); w.rotation.x = -.5; }

  function person(x, y, z, ry, o = {}) {
    const g = new THREE.Group(), m = cloth[o.c ?? Math.floor(Math.random() * cloth.length)];
    const seated = !!o.seated, hip = seated ? .5 : .9;
    if (seated) {
      for (const sx of [-.11, .11]) { add(BX(.13, .13, .45), m, sx, hip, .2, g); add(BX(.12, .48, .12), m, sx, .24, .42, g); }
      add(BX(.46, .05, .44), black, 0, hip - .1, .02, g); add(BX(.46, .5, .04), black, 0, hip + .14, -.2, g);
      for (const [lx, lz] of [[-.2, -.18], [.2, -.18], [-.2, .2], [.2, .2]]) add(CY(.012, .012, hip - .12, 5), black, lx, (hip - .12) / 2, lz, g);
    } else for (const sx of [-.11, .11]) add(CY(.065, .055, hip, 8), m, sx, hip / 2, 0, g);
    const torso = add(new THREE.CapsuleGeometry(.17, .42, 4, 10), m, 0, hip + .36, 0, g);
    const head = add(new THREE.SphereGeometry(.115, 14, 10), skin, 0, hip + .83, .02, g);
    const sh = hip + .55;
    const arm = (sx, rx, rz) => { const a = new THREE.Group(); a.position.set(sx, sh, 0); a.rotation.set(rx, 0, rz); add(CY(.045, .04, .55, 6), m, 0, -.27, 0, a); g.add(a); return a; };
    const pose = o.pose || 'down';
    const P = { down: [[0, .08], [0, -.08]], guitar: [[-.9, .5], [-1.1, -.2]], forward: [[-1.2, .15], [-1.2, -.15]], up: [[-1.6, .35], [-1.5, -.3]], violin: [[-1.4, -.6], [-1, .7]], cello: [[-.7, .3], [-.8, -.45]], mic: [[-1.3, .1], [0, -.08]] }[pose];
    arm(-.22, P[0][0], P[0][1]); arm(.22, P[1][0], P[1][1]);
    const I = o.instr;
    if (I === 'guitar' || I === 'bass') { const L = I === 'bass' ? 1.25 : 1; const gb = new THREE.Group(); gb.position.set(0, hip + .22, .2); gb.rotation.z = -.95;
      add(BX(.36 * L, .42 * L, .08), I === 'bass' ? black : wood, 0, 0, 0, gb); add(BX(.05, .6 * L, .03), woodD, 0, .5 * L, 0, gb); g.add(gb); }
    if (I === 'mic' || I === 'vox') { add(CY(.012, .012, 1.45, 6), kit, 0, .72, .42, g); add(CY(.3, .3, .02, 12), kit, 0, .01, .42, g); add(CY(.025, .018, .14, 8), black, 0, 1.47, .36, g, .5); }
    if (I === 'violin' || I === 'viola') { const k = I === 'viola' ? 1.12 : 1; add(BX(.17 * k, .38 * k, .06), wood, -.12, hip + .62, .2, g, .9, .2, .9); add(CY(.004, .004, .7, 4), black, .15, hip + .62, .3, g, 0, 0, 1.2); }
    if (I === 'cello') { add(BX(.42, .72, .2), wood, 0, hip + .02, .42, g, -.12); add(BX(.06, .5, .04), woodD, 0, hip + .62, .36, g, -.12); add(CY(.005, .005, .8, 4), black, .15, hip + .1, .55, g, 0, 0, 1.4); }
    if (I === 'dbass') { add(BX(.6, 1.05, .28), wood, .3, .75, .3, g, -.08, 0, .12); add(BX(.07, .75, .05), woodD, .22, 1.62, .28, g, -.08, 0, .12); }
    if (I === 'trumpet') add(CY(.06, .018, .45, 10), gold, 0, hip + .76, .32, g, Math.PI / 2 - .25);
    if (I === 'trombone') { add(CY(.08, .02, .5, 10), gold, .06, hip + .74, .35, g, Math.PI / 2 - .2); add(CY(.012, .012, .9, 5), gold, .06, hip + .62, .62, g, Math.PI / 2 - .2); }
    if (I === 'flute') add(CY(.012, .012, .62, 6), silver, .25, hip + .8, .16, g, 0, 0, Math.PI / 2 - .1);
    if (I === 'clarinet') add(CY(.025, .015, .62, 8), black, 0, hip + .52, .28, g, -.55);
    if (I === 'timpani') for (const [tx, r] of [[-.5, .36], [.5, .32]]) { add(CY(r, r * .6, .6, 20), copper, tx, .55, .55, g); add(CY(r, r, .01, 20), new THREE.MeshStandardMaterial({ color: 0xd8d0c0 }), tx, .86, .55, g); }
    if (I === 'keys') { add(BX(1.35, .09, .38), black, 0, 1.0, .45, g); add(BX(1.2, .015, .14), new THREE.MeshStandardMaterial({ color: 0xe8e8e8 }), 0, 1.05, .38, g); for (const sx of [-.45, .45]) add(BX(.04, 1, .04), kit, sx, .5, .45, g, 0, 0, sx > 0 ? .4 : -.4); }
    if (o.stand) { const sz = seated ? .7 : .75; add(CY(.01, .01, 1.05, 5), kit, 0, .52, sz, g); add(BX(.46, .32, .015), black, 0, 1.12, sz - .03, g, -.5); add(BX(.08, .025, .05), lampM, 0, 1.3, sz - .1, g); }
    g.position.set(x, y, z); g.rotation.y = ry; scene.add(g);
    performers.push({ g, y, ph: Math.random() * 6, amp: o.amp ?? (seated ? .006 : .025), sway: o.sway ?? (seated ? .02 : .05), head, torso, ry });
    return g;
  }
  // ---- band (8) ----
  person(0, DECK, -2.5, 0, { instr: 'mic', pose: 'mic', amp: .04, sway: .12, c: 3 });
  person(-5, DECK, -4.5, .25, { instr: 'guitar', pose: 'guitar', amp: .05, sway: .1 });
  person(-7.4, DECK, -6.2, .35, { instr: 'guitar', pose: 'guitar', amp: .04 });
  person(5, DECK, -4.5, -.25, { instr: 'bass', pose: 'guitar', amp: .05, sway: .08 });
  person(0, DECK + .5, -10.3, 0, { seated: true, pose: 'up', amp: .03 });
  person(6.5, DECK + .5, -9.1, -.2, { instr: 'keys', pose: 'forward', amp: .03 });
  person(2.6, DECK, -6.6, -.15, { instr: 'vox', pose: 'mic', c: 4 });
  person(3.9, DECK, -7, -.2, { instr: 'vox', pose: 'mic', c: 3 });
  // ---- orchestra (20) ----
  const XS = [-16.6, -15, -13.4, -11.8, -10.2];
  const L = [['violin', 'violin', 'violin', 'violin', 'violin'], ['violin', 'violin', 'violin', 'viola', 'viola'], ['dbass', 'cello', 'cello', 'cello', 'viola']];
  const R = [['flute', 'flute', 'clarinet', 'clarinet', 'clarinet'], ['trombone', 'trombone', 'trumpet', 'trumpet', 'trumpet'], ['cello', 'cello', 'trombone', 'dbass', 'timpani']];
  const POSE = { violin: 'violin', viola: 'violin', cello: 'cello', flute: 'up', clarinet: 'forward', trumpet: 'up', trombone: 'up', dbass: 'cello', timpani: 'forward' };
  ROWS.forEach((r, ri) => XS.forEach((x, xi) => {
    const li = L[ri][xi], rr = R[ri][4 - xi];
    if (li) person(x, DECK + r.h, r.z, .32, { instr: li, pose: POSE[li], seated: li !== 'dbass', stand: true });
    if (rr) person(-x, DECK + r.h, r.z, -.32, { instr: rr, pose: POSE[rr], seated: !(rr === 'dbass' || rr === 'timpani'), stand: rr !== 'timpani' });
  }));
  for (let i = __n0; i < scene.children.length; i++) { const o = scene.children[i]; o.position.x *= SXZ[0]; o.position.z *= SXZ[1];
    if (o.userData.riser) { o.scale.x *= SXZ[0]; o.scale.z *= SXZ[1]; o.receiveShadow = true; } }
  for (const p of performers) p.g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  // crowd: standing on the pool floor + seated on the terraces; bounces to the beat, some hands up
  { const spots = [];
    const chairs = [];
    for (let z = 8.4; z < VEN.Z1 - .8; z += 1.02) for (let x = -VEN.X + 1.2; x <= VEN.X - 1.2; x += .6) {
      if (Math.abs(x) < 1.1 || Math.abs(Math.abs(x) - 21) < .7) continue;                         // centre + side aisles
      if (Math.abs(x) < 6.5 && z > 43 && z < 51) continue;                                        // FOH
      if (Math.abs(Math.abs(x) - 24) < 1.6 && Math.abs(z - 33) < 1.6) continue;                   // delay towers
      chairs.push([x, z]); if (Math.random() < .93) spots.push([x, .3, z - .05, 1]); }
    for (let k = 0; k < VEN.STEPS; k++) for (let x = -VEN.X + 1; x <= VEN.X - 1; x += .6) { if (Math.abs(x) < 1.1 || Math.random() < .25) continue; spots.push([x, (k + 1) * VEN.RISE + .05, VEN.Z1 + k * VEN.RUN + .62, 0]); }
    { const seatG = new THREE.BoxGeometry(.46, .05, .44).translate(0, .45, 0), backG = new THREE.BoxGeometry(.46, .42, .04).translate(0, .72, .21), legG = new THREE.BoxGeometry(.42, .43, .38).translate(0, .215, 0);
      const chM = new THREE.MeshStandardMaterial({ color: 0x26262c, roughness: .6, metalness: .2 }), lgM = new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: .8, transparent: true, opacity: .55 });
      const ms = [new THREE.InstancedMesh(seatG, chM, chairs.length), new THREE.InstancedMesh(backG, chM, chairs.length), new THREE.InstancedMesh(legG, lgM, chairs.length)], m4c = new THREE.Matrix4();
      chairs.forEach(([x, z], i) => { m4c.makeTranslation(x, 0, z); ms.forEach(m => m.setMatrixAt(i, m4c)); }); ms.forEach(m => scene.add(m)); }
    const N = spots.length, ph = new Float32Array(N), amp = new Float32Array(N);
    const bodyG = new THREE.CapsuleGeometry(.21, .82, 2, 7).translate(0, .65, 0), headG = new THREE.SphereGeometry(.12, 8, 6).translate(0, 1.3, 0), armG = new THREE.CylinderGeometry(.04, .035, .62, 5).translate(0, 1.58, 0);
    const cm = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .85 }), skinM = new THREE.MeshStandardMaterial({ color: 0x6e5444, roughness: .8 });
    const inject = (m) => { m.onBeforeCompile = sh => { sh.uniforms.uBeat = crowdU.uBeat; sh.uniforms.uJump = crowdU.uJump;
      sh.vertexShader = 'attribute float aPh;attribute float aAmp;uniform float uBeat;uniform float uJump;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.y += abs(sin(uBeat + aPh)) * aAmp * uJump;'); }; return m; };
    const body = new THREE.InstancedMesh(bodyG, inject(cm), N), head = new THREE.InstancedMesh(headG, inject(skinM), N);
    const armIdx = []; spots.forEach((s_, i) => { if (Math.random() < .14) armIdx.push(i); });
    const arm = new THREE.InstancedMesh(armG, inject(skinM.clone()), armIdx.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), cc = new THREE.Color();
    spots.forEach(([x, y, z, stand], i) => { const sc = .9 + Math.random() * .18; q.setFromAxisAngle(UP3, Math.PI + (Math.random() - .5) * .35);
      m4.compose(new V3(x, y - .05, z), q, new V3(sc, sc * .72, sc)); body.setMatrixAt(i, m4); head.setMatrixAt(i, m4);
      const hue = Math.random(); cc.setHSL(hue, Math.random() * .4, .07 + Math.random() * .2); body.setColorAt(i, cc);
      ph[i] = Math.random() * 6.28; amp[i] = Math.random() < .35 ? .03 + Math.random() * .04 : .008; });
    armIdx.forEach((i, k) => { const [x, y, z] = spots[i]; e.set((Math.random() - .5) * .5, 0, (Math.random() < .5 ? 1 : -1) * (.15 + Math.random() * .35)); q.setFromEuler(e);
      m4.compose(new V3(x + (Math.random() - .5) * .25, y - .5, z), q, new V3(1, 1, 1)); arm.setMatrixAt(k, m4); });
    const setA = (g, idx) => { g.setAttribute('aPh', new THREE.InstancedBufferAttribute(idx ? Float32Array.from(idx, i => ph[i]) : ph, 1)); g.setAttribute('aAmp', new THREE.InstancedBufferAttribute(idx ? Float32Array.from(idx, i => amp[i] * 1.2) : amp, 1)); };
    setA(bodyG); setA(headG); setA(armG, armIdx);
    for (const m of [body, head, arm]) { m.frustumCulled = false; scene.add(m); } }
}

/* --- LED screen --- */
const screenU = { uT: { value: 0 }, uDim: { value: 0 }, uMode: { value: 1 }, uSpd: { value: 0 }, uCol: { value: new THREE.Color(1, 1, 1) } };
const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(SCREEN.x1 - SCREEN.x0, SCREEN.y1 - SCREEN.y0), new THREE.ShaderMaterial({
  uniforms: screenU, fog: false,
  vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader: `uniform float uT,uDim,uMode,uSpd;uniform vec3 uCol;varying vec2 vUv;
  float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  void main(){vec2 uv=vUv;float t=uT*(0.4+uSpd*0.03);float m=uMode;float v=1.;vec3 c=uCol;
  if(m<0.5){v=1.;}
  else if(m<1.5){v=mix(.15,1.,uv.y)*(.8+.2*sin(t*.7+uv.x*3.));}
  else if(m<2.5){v=step(.5,fract(uv.x*8.-t*.6));}
  else if(m<3.5){float p=sin(uv.x*6.+t)+sin(uv.y*5.-t*1.3)+sin((uv.x+uv.y)*4.+t*.7);v=.5+.5*sin(p*1.7);c=mix(uCol,uCol.gbr,.5+.5*sin(p));}
  else if(m<4.5){float d=length((uv-.5)*vec2(2.9,1.));v=pow(.5+.5*sin(d*12.-t*4.),3.);}
  else if(m<5.5){vec2 g=floor(uv*vec2(13.,4.5));v=step(.5,h(g+floor(t*1.5)));}
  else if(m<6.5){v=.5+.5*sin(uv.x*14.+sin(uv.y*3.+t)*2.-t*2.);v=pow(v,3.);}
  else {vec2 g=floor(uv*vec2(80.,28.));v=step(.93,h(g+floor(t*8.)));}
  vec2 px=fract(uv*vec2(208.,72.));float led=smoothstep(.0,.2,px.x)*smoothstep(1.,.8,px.x)*smoothstep(.0,.2,px.y)*smoothstep(1.,.8,px.y);
  vec3 col=c*v*uDim*1.35*(.55+.45*led);gl_FragColor=vec4(col+vec3(.006),1.);}`
}));
screenMesh.position.set(0, (SCREEN.y0 + SCREEN.y1) / 2, SCREEN.z); scene.add(screenMesh);
for (const sx of [-1, 1]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(12, 6.75), screenMesh.material); m.position.set(sx * 33.5, 15, 4); m.rotation.y = -sx * .38; scene.add(m);
  const fr = box(12.5, 7.2, .35, matDark, sx * 33.5 + sx * .07, 15, 4 - .2); fr.rotation.y = -sx * .38; }
const ledStrip = new THREE.Mesh(new THREE.BoxGeometry(STAGE.x1 - STAGE.x0, .06, .06), new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false })); ledStrip.position.set(0, DECK - .12, STAGE.z1 + .06); scene.add(ledStrip);
box(SCREEN.x1 - SCREEN.x0 + .4, SCREEN.y1 - SCREEN.y0 + .4, .3, matDark, 0, (SCREEN.y0 + SCREEN.y1) / 2, SCREEN.z - .2);

/* --- aggregated scene lights (stage bounce) --- */
const stageLight = new THREE.PointLight(0xffffff, 0, 34, 1.5); stageLight.position.set(0, 9, -10); scene.add(stageLight);
const audLight = new THREE.PointLight(0xffa860, 0, 95, 1); audLight.position.set(0, 18, 10); scene.add(audLight);
/* crowd lighting: colour of beams landing in the audience, split in 3 zones, plus house lights */
const audZones = [-26, 0, 26].map(x => { const L = new THREE.PointLight(0xffffff, 0, 75, 1.1); L.position.set(x, 13, 28); scene.add(L); return { L, c: new THREE.Color() }; });
const houseLights = [[-34, 30, 96], [34, 30, 96], [0, 26, 5]].map(([x, y, z]) => { const L = new THREE.SpotLight(z > 50 ? 0xffd4a0 : 0xdfe6ff, 0, 160, .62, .85, 1.2); L.position.set(x, y, z); L.target.position.set(x * .3, 0, 34); scene.add(L); scene.add(L.target); return L; });
let houseLevel = .3;
const scrLight = new THREE.PointLight(0xffffff, 0, 40, 1.2); scrLight.position.set(0, 8, -16); scene.add(scrLight);

/* --- gobo + glow textures --- */
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function drawGobo(S, i, soft = true) {
  const c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d'), R = S / 2;
  const m = document.createElement('canvas'); m.width = m.height = S; const mx = m.getContext('2d'); mx.fillStyle = '#fff';
  const r = rng(i * 99 + 7);
  if (i === 0) { mx.beginPath(); mx.arc(R, R, R * .96, 0, 7); mx.fill(); }
  if (i === 1) { for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; mx.beginPath(); mx.arc(R + Math.cos(a) * R * .62, R + Math.sin(a) * R * .62, R * .16, 0, 7); mx.fill(); } mx.beginPath(); mx.arc(R, R, R * .18, 0, 7); mx.fill(); }
  if (i === 2) { for (let k = 0; k < 26; k++) { const a = r() * 7, d = Math.sqrt(r()) * R * .8; mx.beginPath(); mx.ellipse(R + Math.cos(a) * d, R + Math.sin(a) * d, R * (.08 + r() * .14), R * (.05 + r() * .1), r() * 3, 0, 7); mx.fill(); } }
  if (i === 3) { for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; mx.beginPath(); mx.moveTo(R, R); mx.lineTo(R + Math.cos(a - .1) * R, R + Math.sin(a - .1) * R); mx.lineTo(R + Math.cos(a + .1) * R, R + Math.sin(a + .1) * R); mx.fill(); } }
  if (i === 4) { for (let k = 0; k < 5; k++) mx.fillRect(S * (.1 + k * .17), 0, S * .09, S); }
  if (i === 5) { for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2 + .3; mx.beginPath(); mx.moveTo(R + Math.cos(a) * R * .15, R + Math.sin(a) * R * .15); mx.lineTo(R + Math.cos(a - .35) * R, R + Math.sin(a - .35) * R); mx.lineTo(R + Math.cos(a + .35) * R, R + Math.sin(a + .35) * R); mx.fill(); } }
  if (i === 6) { mx.strokeStyle = '#fff'; mx.lineWidth = S * .07; for (let k = 1; k <= 4; k++) { mx.beginPath(); mx.arc(R, R, R * k * .22, 0, 7); mx.stroke(); } }
  if (i === 7) { for (let k = 0; k < 6; k++) { mx.save(); mx.translate(R, R); mx.rotate(k / 6 * Math.PI * 2); mx.beginPath(); mx.ellipse(0, R * .45, R * .17, R * .42, 0, 0, 7); mx.fill(); mx.restore(); } }
  // soft circular aperture
  const g = x.createRadialGradient(R, R, 0, R, R, R); g.addColorStop(0, '#fff'); g.addColorStop(.78, '#fff'); g.addColorStop(.98, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, S, S);
  x.globalCompositeOperation = 'destination-in'; if (soft) x.filter = `blur(${S / 90}px)`; x.drawImage(m, 0, 0); x.filter = 'none';
  return c;
}
const goboCanvas = [...Array(8)].map((_, i) => drawGobo(128, i));
const goboIcons = [...Array(8)].map((_, i) => drawGobo(48, i, false).toDataURL());
const goboTex = goboCanvas.map(c => { const t = new THREE.CanvasTexture(c); t.center.set(.5, .5); return t; });
const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, '#fff'); g.addColorStop(.12, 'rgba(255,255,255,.9)'); g.addColorStop(.35, 'rgba(255,255,255,.25)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();

/* --- beam shader --- */
const hazeU = { value: .62 }, timeU = { value: 0 };
const beamGeo = new THREE.CylinderGeometry(0, 1, 1, 40, 1, true).translate(0, -.5, 0);
const BEAM_VS = `varying float vT;varying vec3 vN;varying vec3 vV;varying vec3 vL;varying vec3 vW;
void main(){vT=-position.y;vL=position;vW=(modelMatrix*vec4(position,1.)).xyz;vec4 mv=modelViewMatrix*vec4(position,1.);vV=-mv.xyz;vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*mv;}`;
const BEAM_FS = `uniform vec3 uColor;uniform float uInt,uHaze,uGobo,uGRot,uLen,uEnd,uSoft,uTime;varying float vT;varying vec3 vN;varying vec3 vV;varying vec3 vL;varying vec3 vW;
float h3(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float n3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}
void main(){float f=abs(dot(normalize(vN),normalize(vV)));float edge=pow(f,uSoft);
float d=vT*uLen;float fall=1./(1.+d*.075);float a=smoothstep(0.,.012,vT)*fall;a*=mix(1.,1.-smoothstep(.55,1.,vT),uEnd);
float g=1.;if(uGobo>.5){float an=atan(vL.x,vL.z)+uGRot;float n=uGobo;
 if(n<1.5)g=.5+.5*cos(an*8.);else if(n<2.5)g=.5+.5*sin(an*5.)*sin(an*3.+1.7);else if(n<3.5)g=pow(.5+.5*cos(an*10.),3.);else if(n<4.5)g=.5+.5*cos(an*5.);else if(n<5.5)g=pow(.5+.5*cos(an*3.),2.);else if(n<6.5)g=.75;else g=.5+.5*cos(an*6.);
 g=mix(.12,1.,smoothstep(.25,.75,g));}
a*=smoothstep(3.,26.,length(vV));vec3 hp=vW*.16+vec3(uTime*.05,uTime*.025,-uTime*.035);float hz=.45*n3(hp)+.3*n3(hp*2.3+7.)+.25;float o=uInt*uHaze*edge*a*g*mix(1.,.35+1.1*hz,clamp(uHaze*1.2,0.,1.));gl_FragColor=vec4(uColor,o);}`;

/* --- fixture visuals --- */
const pickables = [];
const darkTrim = new THREE.MeshStandardMaterial({ color: 0x0c0c0e, metalness: .4, roughness: .6 });
// lens faces, one per model; drawn white on black and tinted by the fixture colour (lensMat.color) at runtime
const LENS_TEX = (() => {
  const mk = (draw, w = 128, h = 128) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, w, h); draw(x, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const disc = (x, cx, cy, r, inner = '#fff') => { const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, inner); g.addColorStop(.65, 'rgba(255,255,255,.85)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); };
  const hex = (x, cx, cy, r) => { x.beginPath(); for (let k = 0; k < 6; k++) { const a = (k + .5) / 6 * Math.PI * 2; x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } x.closePath(); };
  const L = {
    // Robe FORTE: one large 180 mm front lens, with faint rings from the zoom optics behind it
    forte: mk(x => { disc(x, 64, 64, 62); x.strokeStyle = 'rgba(0,0,0,.28)'; x.lineWidth = 2; for (const r of [16, 30, 44, 56]) { x.beginPath(); x.arc(64, 64, r, 0, 7); x.stroke(); } }),
    // Robe MegaPointe: the hot spot of the short-arc lamp in a deep, dark lens
    megapointe: mk(x => { const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, '#fff'); g.addColorStop(.25, '#fff'); g.addColorStop(.3, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,.08)'); x.fillStyle = g; x.beginPath(); x.arc(64, 64, 63, 0, 7); x.fill(); }),
    // Robe Spiider: a centre cell and 18 hexagonal cells in two rings, black ribs between the domed lenses
    spiider: mk(x => { const d = 25;
      for (let q = -2; q <= 2; q++) for (let r = -2; r <= 2; r++) { if (Math.abs(q + r) > 2) continue; const cx = 64 + d * (q + r / 2), cy = 64 + d * r * Math.sqrt(3) / 2;
        const g = x.createRadialGradient(cx - 2, cy - 3, 0, cx, cy, 14); g.addColorStop(0, '#fff'); g.addColorStop(.5, 'rgba(255,255,255,.85)'); g.addColorStop(1, 'rgba(255,255,255,.3)'); x.fillStyle = g; hex(x, cx, cy, 13); x.fill(); }
      x.globalCompositeOperation = 'destination-in'; x.beginPath(); x.arc(64, 64, 63, 0, 7); x.fill(); }),
    // Robe ParFect 150: 7 multichip cells
    parfect: mk(x => { const pts = [[0, 0]]; for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; pts.push([Math.cos(a) * 34, Math.sin(a) * 34]); } for (const [px, py] of pts) disc(x, 64 + px, 64 + py, 16); }),
    // Chauvet STRIKE 4: one warm cup (the model maps it on each of its 4 cups): faceted reflector behind a wire grid
    strike4: mk(x => { const g = x.createRadialGradient(64, 64, 0, 64, 64, 62); g.addColorStop(0, '#fff'); g.addColorStop(.7, 'rgba(255,244,214,.9)'); g.addColorStop(1, 'rgba(255,226,170,.45)'); x.fillStyle = g; x.beginPath(); x.arc(64, 64, 62, 0, 7); x.fill();
      x.strokeStyle = 'rgba(0,0,0,.2)'; x.lineWidth = 2; for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; x.beginPath(); x.moveTo(64, 64); x.lineTo(64 + Math.cos(a) * 62, 64 + Math.sin(a) * 62); x.stroke(); }
      x.strokeStyle = 'rgba(0,0,0,.6)'; x.lineWidth = 1.5; for (let i = 8; i < 128; i += 10) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 128); x.moveTo(0, i); x.lineTo(128, i); x.stroke(); }
      x.globalCompositeOperation = 'destination-in'; x.beginPath(); x.arc(64, 64, 62, 0, 7); x.fill(); }),
    // Robe WTF!: two panels of tiny white strobe cups, with the warm amber blinder strip across the middle
    wtf: mk(x => { x.fillStyle = 'rgba(255,255,255,.92)'; for (const [y0, y1] of [[6, 52], [76, 122]]) for (let y = y0 + 3; y < y1; y += 5.5) for (let i = 0, cx = 5; cx < 252; cx += 5.5, i++) { x.beginPath(); x.arc(cx + (Math.round(y) % 2 ? 2.7 : 0), y, 2.1, 0, 7); x.fill(); }
      x.fillStyle = '#ffae3c'; x.fillRect(8, 59, 240, 10); x.fillStyle = '#ffe2a8'; for (let cx = 10; cx < 246; cx += 4) x.fillRect(cx, 61, 2, 6); }, 256, 128),
    // Robe Tetra2: 18 rounded cells in one row, in two groups of 9
    tetra2: mk(x => { for (let i = 0; i < 18; i++) { const cx = 10.5 + i * 13.3 + (i >= 9 ? 3 : 0), g = x.createRadialGradient(cx, 14, 0, cx, 16, 12); g.addColorStop(0, '#fff'); g.addColorStop(.6, 'rgba(255,255,255,.85)'); g.addColorStop(1, 'rgba(255,255,255,.35)');
      x.fillStyle = g; x.beginPath(); if (x.roundRect) x.roundRect(cx - 5.6, 4, 11.2, 24, 4); else x.rect(cx - 5.6, 4, 11.2, 24); x.fill(); } }, 256, 32),
    // ETC Source Four: one hard-edged lens
    s4: mk(x => { const g = x.createRadialGradient(64, 64, 0, 64, 64, 60); g.addColorStop(0, '#fff'); g.addColorStop(.85, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,.4)'); x.fillStyle = g; x.beginPath(); x.arc(64, 64, 60, 0, 7); x.fill(); }),
  };
  L.forteFS = L.forte; return L;
})();
/* real spot lights: the brightest fixtures hitting the stage light performers & scenery (3 with soft shadows) */
const KEY_N = 12, KEY_SH = 4, keyLights = [];
for (let i = 0; i < KEY_N; i++) { const L = new THREE.SpotLight(0xffffff, 0, 0, .3, .5, 2); L.castShadow = i < KEY_SH;
  if (L.castShadow) { L.shadow.mapSize.set(1024, 1024); L.shadow.bias = -.0004; L.shadow.camera.near = 2; L.shadow.camera.far = 70; L.shadow.radius = 3; }
  scene.add(L); scene.add(L.target); keyLights.push(L); }
const UP = new V3(0, 1, 0), DOWN = new V3(0, -1, 0);
const cylG = new THREE.CylinderGeometry(1, 1, 1, 18), boxG = new THREE.BoxGeometry(1, 1, 1), circG = new THREE.CircleGeometry(1, 20), planeG = new THREE.PlaneGeometry(1, 1), poolG = new THREE.PlaneGeometry(2, 2);
/* --- fixture models: one procedural builder per real product (TYPES[...].model) ---
   Geometry is in fixture units (buildVis scales the fixture group by T.size) and is built once per model, then shared by every
   fixture of that model. Parts of one material are merged into one mesh and fine details (screens, vents, lens cells) are canvas
   textures, so each fixture costs only a few draw calls. All models are built in the hang orientation: base up, head below,
   tilt axis at the group origin, lens facing -Y. Floor movers are turned over by buildVis; static floor units flip their stand. */
const _m4 = new THREE.Matrix4(), _q4 = new THREE.Quaternion(), _eu = new THREE.Euler(), _pv = new V3(), _sv = new V3();
// a transformed, non-indexed copy of a primitive, ready to merge (scale, then rotate XYZ, then move)
function part(geo, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  return g.applyMatrix4(_m4.compose(_pv.set(x, y, z), _q4.setFromEuler(_eu.set(rx, ry, rz)), _sv.set(sx, sy, sz)));
}
// joins parts into one geometry (position, normal, uv); BufferGeometryUtils is not vendored and this is all the models need
function merge(parts) {
  let n = 0; for (const p of parts) n += p.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2); let o = 0;
  for (const p of parts) { const a = p.attributes; pos.set(a.position.array, o * 3); nor.set(a.normal.array, o * 3); if (a.uv) uv.set(a.uv.array, o * 2); o += a.position.count; p.dispose(); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.computeBoundingSphere(); return g;
}
const Bx = (x, y, z, w, h, d, rx = 0, ry = 0, rz = 0) => part(boxG, x, y, z, w, h, d, rx, ry, rz);
const Cy = (x, y, z, r, h, rx = 0, ry = 0, rz = 0) => part(cylG, x, y, z, r, h, r, rx, ry, rz);                 // cylinder, axis Y before rotation
const CyX = (x, y, z, r, len) => Cy(x, y, z, r, len, 0, 0, Math.PI / 2);                                       // cylinder along X (tilt hubs, knobs)
// a revolved profile around Y; list the [radius, y] points from front (-y) to rear (+y) so the faces point outward
const lathe = (pts, seg = 28) => part(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg));
const sphG = new THREE.SphereGeometry(1, 8, 6), torG = new THREE.TorusGeometry(1, .12, 6, 20);
const canvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
const ventSlots = (x, x0, y0, w, h, n) => { x.fillStyle = '#2a2a30'; x.fillRect(x0, y0, w, h); x.fillStyle = '#060607'; for (let i = 0; i < n; i++) x.fillRect(x0 + 3, y0 + 3 + i * (h - 6) / n, w - 6, (h - 6) / n * .55); };
// front of a Robe base: vents either side of the RNS2 colour screen (ROBE splash) and its 4 menu buttons
const panelMat = new THREE.MeshBasicMaterial({ map: canvasTex(256, 64, x => {
  x.fillStyle = '#121215'; x.fillRect(0, 0, 256, 64); ventSlots(x, 6, 8, 74, 48, 8); ventSlots(x, 176, 8, 74, 48, 8);
  x.fillStyle = '#050506'; x.fillRect(88, 6, 80, 52); const g = x.createLinearGradient(0, 10, 0, 50); g.addColorStop(0, '#1d3f7a'); g.addColorStop(1, '#0b1730'); x.fillStyle = g; x.fillRect(92, 10, 50, 40);
  x.fillStyle = '#fff'; x.font = 'bold 13px Arial'; x.textAlign = 'center'; x.fillText('ROBE', 116, 35); x.fillStyle = '#e03030'; x.fillRect(135, 28, 3, 3);
  x.fillStyle = '#3a3a40'; for (let i = 0; i < 4; i++) x.fillRect(148, 12 + i * 10, 14, 6); }) });
const ventMat = new THREE.MeshStandardMaterial({ color: 0xa0a0a8, metalness: .5, roughness: .5, map: canvasTex(64, 64, x => { ventSlots(x, 0, 0, 64, 64, 9); }) });
const aluMat = new THREE.MeshStandardMaterial({ color: 0xb4b8c0, metalness: .85, roughness: .32 });
const MODEL_GEO = {};
const geoOf = (key, make) => MODEL_GEO[key] || (MODEL_GEO[key] = make());
// Robe moving heads (FORTE, FORTE FS, MegaPointe, Spiider) share the base and the yoke design; they differ in the head
const robeBase = () => geoOf('robeBase', () => ({   // rounded base with recessed side handles, feet and the truss clamp
  body: merge([Bx(0, .83, 0, .84, .26, .70), Bx(0, .83, 0, 1.0, .26, .54), ...[-1, 1].flatMap(sx => [-1, 1].map(sz => Cy(sx * .42, .83, sz * .27, .08, .26)))]),
  trim: merge([...[-1, 1].map(sx => Bx(sx * .505, .83, 0, .03, .08, .42)), ...[-1, 1].flatMap(sx => [-1, 1].map(sz => Cy(sx * .38, .975, sz * .24, .045, .03))), Bx(0, .985, 0, .62, .03, .12), Cy(0, 1.03, 0, .09, .12)]),
}));
// thick U yoke: bearing, cross-member, arms with rounded ends at the tilt axis, angled inner corners, outer covers with grip lines
const robeYoke = ax => ({
  yoke: merge([Cy(0, .02, 0, .2, .06), Bx(0, -.03, 0, ax * 2 + .12, .09, .34), ...[-1, 1].flatMap(sx => [
    Bx(sx * ax, -.33, 0, .12, .62, .34), CyX(sx * ax, -.66, 0, .17, .12), Bx(sx * (ax - .04), -.075, 0, .1, .1, .32, 0, 0, Math.PI / 4), Bx(sx * (ax + .085), -.28, 0, .05, .42, .28)])]),
  yokeTrim: merge([-1, 1].flatMap(sx => [CyX(sx * (ax + .075), -.66, 0, .11, .03), ...[0, 1, 2].map(k => Bx(sx * (ax + .112), -.2, -.06 + k * .06, .012, .12, .025))])),
});
const ROBE_HEADS = {
  // FORTE: long barrel, wider body around the tilt axis, ribbed rear underside, stepped front bezel around the 180 mm lens
  forte: { ax: .43, lensR: .235, lensY: .772, lensOff: .78, geo: fs => ({
    head: merge([lathe([[.26, -.72], [.30, -.70], [.30, -.42], [.315, -.30], [.33, -.15], [.335, .05], [.33, .2], [.31, .32], [.27, .40], [.18, .44], [0, .45]])]),
    headTrim: merge([lathe([[.235, -.78], [.30, -.78], [.30, -.765], [.325, -.755], [.325, -.69], [.305, -.68]]), ...[.12, .17, .22, .27].map(y => Cy(0, y, 0, .345, .014)),
      // FORTE FS: the RoboSpot camera on top of the barrel, next to the lens
      ...(fs ? [Bx(-.13, -.5, .40, .12, .26, .12), Cy(-.13, -.645, .40, .045, .04), Bx(-.13, -.47, .345, .06, .1, .03)] : [])]) }) },
  // MegaPointe: short, fat head; deep lens inside a thick front ring; vent grilles on the head sides
  megapointe: { ax: .51, lensR: .27, lensY: .445, lensOff: .53, geo: () => ({
    head: merge([lathe([[.36, -.40], [.40, -.37], [.41, -.2], [.41, .1], [.39, .24], [.33, .33], [.2, .37], [0, .38]])]),
    headTrim: merge([lathe([[.27, -.53], [.40, -.53], [.42, -.50], [.42, -.40], [.40, -.37]]), lathe([[.27, -.44], [.27, -.53]])]),   // ring, then its inner wall (listed rear to front: faces inward)
    vents: merge([Bx(0, .06, .405, .30, .26, .02), Bx(0, .06, -.405, .30, .26, .02)]) }) },
  // Spiider: wide, short drum; the front is all honeycomb lens (texture); grooves round the drum
  spiider: { ax: .62, lensR: .48, lensY: .30, lensOff: .305, geo: () => ({
    head: merge([lathe([[.50, -.27], [.52, -.24], [.525, -.1], [.52, .03], [.49, .10], [.41, .15], [.24, .18], [0, .19]], 32)]),
    headTrim: merge([lathe([[.47, -.305], [.525, -.305], [.535, -.29], [.535, -.25], [.52, -.24]], 32), ...[-.16, -.12, -.08].map(y => Cy(0, y, 0, .53, .012))]) }) },
};
ROBE_HEADS.forteFS = { ...ROBE_HEADS.forte };
const robePanel = (c, par, y, z, w, h) => { const p = c.mk(planeG, panelMat, par); p.position.set(0, y, z); p.scale.set(w, h, 1); if (c.floor) p.rotation.z = Math.PI; return p; };  // keep the screen upright on floor units
function robeMover(f, c) {
  const H = ROBE_HEADS[f.T.model], G = geoOf(f.T.model, () => ({ ...H.geo(f.T.model === 'forteFS'), ...robeYoke(H.ax) })), BS = robeBase();
  const base = c.mk(BS.body, c.bodyMat, c.g); c.mk(BS.trim, darkTrim, c.g); robePanel(c, c.g, .83, .351, .96, .22);
  const yoke = new THREE.Group(); yoke.position.y = .66; c.g.add(yoke); c.mk(G.yoke, c.bodyMat, yoke); c.mk(G.yokeTrim, darkTrim, yoke);
  const tiltG = new THREE.Group(); tiltG.position.y = -.66; yoke.add(tiltG);
  const head = c.mk(G.head, c.bodyMat, tiltG); c.mk(G.headTrim, darkTrim, tiltG); if (G.vents) c.mk(G.vents, ventMat, tiltG);
  const lens = c.mk(circG, c.lensMat, tiltG); lens.rotation.x = Math.PI / 2; lens.position.y = -H.lensY; lens.scale.setScalar(H.lensR);
  return { head, lens, lensOff: H.lensOff, yoke, tiltG, pick: [base, head] };
}
// static units: c.st is the stand (bracket/yoke, turned to the fixed pan; flipped on the floor), c.aim holds the tilting head
const flatLens = (c, y, w, h) => { const l = c.mk(planeG, c.lensMat, c.aim); l.rotation.x = Math.PI / 2; l.position.y = y; l.scale.set(w, h, 1); return l; };
const BUILD = {
  forte: robeMover, forteFS: robeMover, megapointe: robeMover, spiider: robeMover,
  // Robe WTF!: wide 2:1 box head between two rounded side towers, base with screen on top
  wtf(f, c) {
    const G = geoOf('wtf', () => ({
      base: merge([Bx(0, .44, 0, .56, .12, .40), Bx(0, .35, 0, 1.24, .07, .30), ...[-1, 1].flatMap(sx => [Bx(sx * .57, .17, 0, .1, .36, .34), CyX(sx * .57, 0, 0, .17, .1)])]),
      baseTrim: merge([...[-1, 1].map(sx => Bx(sx * .285, .44, 0, .02, .06, .26)), ...[-1, 1].map(sx => CyX(sx * .63, 0, 0, .1, .025))]),
      head: merge([Bx(0, 0, 0, 1.0, .24, .48), Bx(0, .15, 0, .88, .08, .40)]),
      headTrim: merge([...[-1, 1].map(sz => Bx(0, -.125, sz * .235, 1.02, .035, .035)), ...[-1, 1].map(sx => Bx(sx * .495, -.125, 0, .035, .035, .48)), ...[-.3, 0, .3].map(x => Bx(x, .2, 0, .02, .02, .36))]),
    }));
    const base = c.mk(G.base, c.bodyMat, c.st); c.mk(G.baseTrim, darkTrim, c.st); robePanel(c, c.st, .44, .201, .50, .11);
    const head = c.mk(G.head, c.bodyMat, c.aim); c.mk(G.headTrim, darkTrim, c.aim);
    return { head, lens: flatLens(c, -.13, .94, .42), lensOff: .13, pick: [base, head] };
  },
  // Chauvet STRIKE 4: four round cups on an X-shaped plate, wire grids (lens texture), U-bracket with clamp
  strike4(f, c) {
    const cups = [[-.23, -.23], [.23, -.23], [-.23, .23], [.23, .23]];
    const G = geoOf('strike4', () => ({
      head: merge([Bx(0, .02, 0, .40, .26, .40), ...cups.map(([x, z]) => Cy(x, 0, z, .2, .32))]),
      headTrim: merge(cups.map(([x, z]) => part(torG, x, -.16, z, .19, .19, .19, Math.PI / 2))),
      lens: merge(cups.map(([x, z]) => part(circG, x, -.165, z, .18, .18, 1, Math.PI / 2))),
      stand: merge([...[-1, 1].map(sx => Bx(sx * .5, .25, 0, .04, .5, .1)), Bx(0, .5, 0, 1.04, .04, .1), Cy(0, .64, 0, .045, .26), ...[-1, 1].map(sx => CyX(sx * .53, 0, 0, .06, .04))]),
    }));
    c.mk(G.stand, darkTrim, c.st);
    const head = c.mk(G.head, c.bodyMat, c.aim); c.mk(G.headTrim, darkTrim, c.aim);
    return { head, lens: c.mk(G.lens, c.lensMat, c.aim), lensOff: .17, pick: [head] };
  },
  // Robe ParFect 150: static cylinder with cooling rings, rear handle, 4-leaf barndoor, U-bracket (a floor stand when on the deck)
  parfect(f, c) {
    const G = geoOf('parfect', () => ({
      head: merge([lathe([[.33, -.45], [.34, -.42], [.34, .2], [.31, .32], [.22, .38], [0, .39]])]),
      headTrim: merge([lathe([[.29, -.475], [.355, -.475], [.355, -.43], [.34, -.42]]), ...[0, .05, .1, .15].map(y => Cy(0, y, 0, .35, .018)), Bx(0, .45, 0, .05, .05, .36), ...[-1, 1].map(sz => Bx(0, .41, sz * .16, .05, .07, .05))]),
      doors: merge([...[-1, 1].map(sz => Bx(0, -.61, sz * .42, .62, .30, .015, -sz * .44, 0, 0)), ...[-1, 1].map(sx => Bx(sx * .42, -.61, 0, .015, .30, .55, 0, 0, sx * .44))]),
      stand: merge([...[-1, 1].map(sx => Bx(sx * .40, .23, 0, .035, .46, .14)), Bx(0, .46, 0, .835, .035, .14), ...[-1, 1].map(sx => CyX(sx * .43, 0, 0, .07, .05))]),
    }));
    c.mk(G.stand, darkTrim, c.st);
    const head = c.mk(G.head, c.bodyMat, c.aim); c.mk(G.headTrim, darkTrim, c.aim); c.mk(G.doors, aluMat, c.aim);
    const lens = c.mk(circG, c.lensMat, c.aim); lens.rotation.x = Math.PI / 2; lens.position.y = -.47; lens.scale.setScalar(.29);
    return { head, lens, lensOff: .48, pick: [head] };
  },
  // ETC Source Four: finned lamp housing at the rear, shutter barrel with 4 handles, lens tube, colour-frame holder; yoke + C-clamp
  s4(f, c) {
    const G = geoOf('s4', () => ({
      head: merge([lathe([[.14, -.62], [.15, -.60], [.15, -.22], [.21, -.20], [.21, .02], [.25, .08], [.25, .22], [.20, .30], [.10, .36], [.10, .44], [0, .45]])]),
      headTrim: merge([...[.1, .14, .18, .22].map(y => Cy(0, y, 0, .265, .014)), ...[0, 1, 2, 3].map(k => { const a = (k + .5) * Math.PI / 2; return Bx(Math.sin(a) * .26, -.1, Math.cos(a) * .26, .03, .03, .11, 0, a, 0); }),
        ...[-1, 1].map(sz => Bx(0, -.63, sz * .165, .36, .025, .03)), ...[-1, 1].map(sx => Bx(sx * .165, -.63, 0, .03, .025, .36)), Bx(0, .5, 0, .05, .1, .05)]),
      stand: merge([...[-1, 1].map(sx => Bx(sx * .32, .27, 0, .035, .6, .08)), Bx(0, .57, 0, .675, .035, .08), ...[-1, 1].map(sx => CyX(sx * .36, 0, 0, .06, .06)), Bx(0, .65, 0, .1, .12, .08), Cy(0, .76, 0, .025, .14)]),
    }));
    c.mk(G.stand, darkTrim, c.st);
    const head = c.mk(G.head, c.bodyMat, c.aim); c.mk(G.headTrim, darkTrim, c.aim);
    const lens = c.mk(circG, c.lensMat, c.aim); lens.rotation.x = Math.PI / 2; lens.position.y = -.62; lens.scale.setScalar(.14);
    return { head, lens, lensOff: .64, pick: [head] };
  },
  // Robe Tetra2: long base with screen and vents, two end pivots, a tilting bar head with 18 cells (no pan)
  tetra2(f, c) {
    const G = geoOf('tetra2', () => ({
      base: merge([Bx(0, .20, 0, 1.0, .10, .14), ...[-1, 1].flatMap(sx => [Bx(sx * .475, .08, 0, .05, .2, .12), CyX(sx * .475, 0, 0, .06, .05)])]),
      baseTrim: merge([...[-1, 1].flatMap(sx => [-1, 1].map(sz => Bx(sx * .42, .257, sz * .045, .06, .015, .03))), ...[-1, 1].map(sx => Bx(sx * .3, .2, .071, .2, .07, .004))]),
      head: merge([Bx(0, 0, 0, .9, .10, .13), Bx(0, .06, 0, .86, .03, .1)]),
      headTrim: merge([...[-1, 1].map(sz => Bx(0, -.05, sz * .064, .9, .02, .012)), ...[-1, 0, 1].map(sx => Bx(sx * .445, -.05, 0, .012, .02, .13))]),
    }));
    const base = c.mk(G.base, c.bodyMat, c.g); c.mk(G.baseTrim, darkTrim, c.g); robePanel(c, c.g, .2, .0715, .36, .09);
    const yoke = new THREE.Group(); c.g.add(yoke); const tiltG = new THREE.Group(); yoke.add(tiltG);   // pivots are fixed to the base: the yoke never pans
    const head = c.mk(G.head, c.bodyMat, tiltG); c.mk(G.headTrim, darkTrim, tiltG);
    const lens = c.mk(planeG, c.lensMat, tiltG); lens.rotation.x = Math.PI / 2; lens.position.y = -.052; lens.scale.set(.87, .115, 1);
    return { head, lens, lensOff: .055, yoke, tiltG, pick: [base, head] };
  },
};
function buildVis(f) {
  const T = f.T;
  if (T.shape === 'screen') { screenMesh.userData.fix = f; pickables.push(screenMesh); f.vo = { screen: true }; return; }
  const s = T.size, floor = f.mount === 'floor', g = new THREE.Group(); g.position.copy(f.pos); g.scale.setScalar(s); scene.add(g);
  if (T.moving && floor) g.rotation.z = Math.PI;   // floor movers stand on their base
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x232328, metalness: .55, roughness: .38, emissive: 0x000000 });
  const lensMat = new THREE.MeshBasicMaterial({ color: 0x050505, side: THREE.DoubleSide, toneMapped: false, map: LENS_TEX[T.model] });
  const pivot = new THREE.Group(); g.add(pivot);
  // statics: pivot gets the shortest-arc rotation DOWN -> aim each frame, which rolls the head by -pan; aim.rotation.y = pan undoes it
  let aim = null, st = null;
  if (!T.moving) { const pan = (f.fixed ? f.fixed.pan : 0) * D2R; aim = new THREE.Group(); aim.rotation.y = pan; pivot.add(aim); st = new THREE.Group(); st.rotation.set(0, pan, floor ? Math.PI : 0); g.add(st); }
  const mk = (geo, mat, par) => { const o = new THREE.Mesh(geo, mat); par.add(o); return o; };
  const b = BUILD[T.model](f, { g, aim, st, bodyMat, lensMat, mk, floor });
  for (const m of b.pick) { m.userData.fix = f; pickables.push(m); }
  let pix = null;
  if (f.pix) { pix = new THREE.Mesh(boxG, new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false })); pix.position.copy(f.pix.p);
    pix.quaternion.setFromUnitVectors(new V3(1, 0, 0), f.pix.tan); pix.scale.set(f.pix.len, .07, .07); scene.add(pix); }
  const bu = { uColor: { value: new THREE.Color() }, uInt: { value: 0 }, uHaze: hazeU, uGobo: { value: 0 }, uGRot: { value: 0 }, uLen: { value: 30 }, uEnd: { value: 0 }, uTime: timeU, uSoft: { value: T.soft ?? 1.6 } };
  const beam = new THREE.Mesh(beamGeo, new THREE.ShaderMaterial({ uniforms: bu, vertexShader: BEAM_VS, fragmentShader: BEAM_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
  beam.frustumCulled = false; scene.add(beam);
  const pool = new THREE.Mesh(poolG, new THREE.MeshBasicMaterial({ map: goboTex[0], transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  scene.add(pool);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
  scene.add(glow);
  f.vo = { g, pivot, head: b.head, lens: b.lens, lensOff: b.lensOff * s, bodyMat, lensMat, beam, bu, pool, glow, poolTex: [], s, yoke: b.yoke || null, tiltG: b.tiltG || null, flip: floor, pix };
}
fixtures.forEach(buildVis);

/* --- scenery props (not patched): Antari HZ-500 hazers upstage, and the RoboSpot station that runs the follow spots --- */
const puffs = [];
{ // HZ-500: black road case with aluminium edges, ball corners, butterfly latches, handle; the nozzle opening and lid flap on top
  const caseMat = new THREE.MeshStandardMaterial({ color: 0x141417, roughness: .55, metalness: .2 });
  const body = merge([Bx(0, .18, 0, .5, .34, .36), Bx(0, .365, -.04, .16, .02, .1), Bx(0, .40, -.11, .17, .01, .12, -.6, 0, 0)]);
  const alu = merge([...[.01, .35, .28].flatMap(y => [-1, 1].map(sz => Bx(0, y, sz * .18, .52, .02, .02))), ...[.01, .35].flatMap(y => [-1, 1].map(sx => Bx(sx * .25, y, 0, .02, .02, .38))),
    ...[-1, 1].flatMap(sx => [-1, 1].map(sz => Bx(sx * .25, .18, sz * .18, .02, .36, .02))), ...[.01, .35].flatMap(y => [-1, 1].flatMap(sx => [-1, 1].map(sz => part(sphG, sx * .25, y, sz * .18, .028, .028, .028)))),
    ...[-1, 1].map(sx => Bx(sx * .14, .28, .186, .07, .07, .01)), Bx(0, .15, .186, .14, .07, .012)]);
  const puffTex = canvasTex(64, 64, x => { for (let k = 0; k < 7; k++) { const cx = 32 + (Math.random() - .5) * 18, cy = 32 + (Math.random() - .5) * 18, r = 14 + Math.random() * 12, g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); } });
  for (const [x, z] of [[-20.6, -15.6], [20.6, -15.6], [-12.1, -19.3], [12.1, -19.3]]) {
    const g = new THREE.Group(); g.position.set(x, DECK, z); g.add(new THREE.Mesh(body, caseMat), new THREE.Mesh(alu, aluMat)); scene.add(g);
    for (let k = 0; k < 3; k++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, color: 0xc4c8d2, transparent: true, depthWrite: false, opacity: 0 })); sp.visible = false; scene.add(sp); puffs.push({ sp, x, z, ph: k / 3 }); }
  }
}
// a soft puff of haze rises from each hazer; its density follows the Haze master
function updateProps(now) {
  const h = hazeU.value;
  for (const p of puffs) { p.sp.visible = h > .01; if (!p.sp.visible) continue;
    const k = (now * .16 + p.ph) % 1, sc = (.5 + k * 2.4) * (.6 + h * .6);
    p.sp.position.set(p.x + Math.sin(now * .4 + p.ph * 6) * .2 * k, DECK + .85 + k * 2.2, p.z - k * .6); p.sp.scale.set(sc, sc, 1);
    p.sp.material.opacity = h * .55 * Math.sin(Math.PI * k); }
}
{ // RoboSpot BaseStation on a flight case at FOH: pan/tilt handles, fader panel, hooded monitor, clipboard; hidden with the FOH riser in the MA view
  const m = new THREE.MeshStandardMaterial({ color: 0x232328, roughness: .5, metalness: .4 });
  const body = merge([Bx(0, .275, 0, .7, .55, .5), Bx(0, .63, 0, .62, .16, .45), Cy(0, .77, 0, .14, .12), Bx(0, .9, 0, .5, .14, .22), Bx(0, 1.0, .05, .38, .05, .2, .35, 0, 0),
    ...[-1, 1].map(sx => CyX(sx * .42, .9, .06, .03, .34)), Bx(0, 1.12, -.02, .06, .14, .06), Bx(0, 1.3, -.02, .62, .38, .06), Bx(0, 1.5, .09, .66, .02, .24), ...[-1, 1].map(sx => Bx(sx * .32, 1.3, .09, .02, .38, .24)),
    Bx(-.55, 1.25, .02, .26, .36, .02, 0, .35, 0)]);
  const scr = canvasTex(128, 72, x => { x.fillStyle = '#04081a'; x.fillRect(0, 0, 128, 72); x.fillStyle = '#10142a'; x.fillRect(0, 54, 128, 18);
    for (let i = 0; i < 6; i++) { const bx = 14 + i * 20, g = x.createLinearGradient(bx, 0, 64, 60); g.addColorStop(0, 'rgba(120,170,255,.9)'); g.addColorStop(1, 'rgba(60,110,255,0)'); x.fillStyle = g; x.beginPath(); x.moveTo(bx - 2, 0); x.lineTo(bx + 2, 0); x.lineTo(64 + (i - 2.5) * 6, 58); x.lineTo(64 + (i - 2.5) * 4, 58); x.fill(); }
    x.fillStyle = '#e8eeff'; x.fillRect(62, 46, 4, 10); });
  const g = new THREE.Group(); g.position.set(3.0, 5.0, 47.3); g.add(new THREE.Mesh(body, m)); scene.add(g);
  const sc = new THREE.Mesh(planeG, new THREE.MeshBasicMaterial({ map: scr })); sc.position.set(0, 1.3, .012); sc.scale.set(.56, .32, 1); g.add(sc);
  g.visible = fohRig.length ? fohRig[0].visible : true; fohRig.push(g);
}

/* ====================================================================
   SHOW DATA: groups, presets, executors, programmer
==================================================================== */
let groups = {}, presets = { 1: {}, 2: {}, 3: {}, 4: {}, 5: {} };
const PRESET_TYPES = { 1: 'Dimmer', 2: 'Position', 3: 'Gobo', 4: 'Color', 5: 'Beam' };
const PT_FEAT = { 1: ['dim'], 2: ['pos'], 3: ['gobo'], 4: ['color'], 5: ['beam'] };
const execs = [...Array(10)].map((_, i) => ({ name: '', cues: [], cur: -1, level: 0, on: false, lastGo: 0, vals: {}, fx: {}, fade: null, flash: false, flashOnly: false, cache: {} }));
const autoExec = { name: 'AUTO', cues: [], cur: -1, level: 0, on: false, lastGo: 0, vals: {}, fx: {}, fade: null, flash: false, cache: {}, auto: true };
const allExecs = [...execs, autoExec];
let selExec = 0;
const prog = { vals: {}, fxList: [], fx: {} };
let sel = [];
let beatOrigin = 0;
let bpm = 120, gm = 1, blackout = false, highlight = false, fanMode = false, storeMode = false;

function defaultGroups() {
  const g = {}; let n = 1; const G = (name, ids) => g[n++] = { name, ids };
  G('FOH Spots', range(101, 199)); G('Beams Truss 2', range(201, 299)); G('Washes Truss 3', range(301, 399)); G('Spots Truss 4', range(401, 499));
  G('Back Beams', range(501, 599)); G('Tower Washes', range(601, 699)); G('Floor Beams', range(701, 799)); G('Floor Washes', range(1001, 1099));
  G('Screen Pars', range(1101, 1199)); G('Blinders', range(801, 899)); G('Strobes', range(901, 999)); G('LED Screen', [2001]);
  G('All Beams', [...range(201, 299), ...range(501, 599), ...range(701, 799), ...range(1201, 1299), ...range(1401, 1499), ...range(1601, 1699)]); G('All Spots', idsOfType('spot')); G('All Washes', idsOfType('wash'));
  G('All Movers', fixtures.filter(f => f.T.moving).map(f => f.id));
  G('Floor Beams Odd', range(701, 799).filter((_, i) => i % 2 === 0)); G('Floor Beams Even', range(701, 799).filter((_, i) => i % 2 === 1));
  G('Beams T2 Left', range(201, 215)); G('Beams T2 Right', range(216, 230)); G('Towers Left', range(601, 612)); G('Towers Right', range(613, 624));
  G('Everything', fixtures.filter(f => f.type !== 'screen').map(f => f.id));
  G('Ring Beams', range(1201, 1299)); G('Ring Washes', range(1301, 1399)); G('Angled Beams', range(1401, 1499)); G('Angled Spots', range(1501, 1599));
  G('Ring Odd', range(1201, 1299).filter((_, i) => i % 2 === 0)); G('Ring Even', range(1201, 1299).filter((_, i) => i % 2 === 1)); G('All Angled', range(1401, 1599)); G('Tower Beams', range(1601, 1699)); G('Tower Washes', range(1701, 1799)); G('Audience Washes', range(1801, 1899)); G('Delay Towers', range(1813, 1818));
  G('LED Bars', range(2101, 2199)); G('Follow Spots', range(1901, 1999)); G('Profiles', range(2201, 2299));   // 35-37: append only, the demo show uses group numbers
  return g;
}
const COLORS = [['White', 100, 100, 100], ['Warm', 100, 80, 55], ['CTO', 100, 58, 22], ['Red', 100, 0, 0], ['Orange', 100, 32, 0], ['Amber', 100, 52, 0], ['Yellow', 100, 88, 0], ['Lime', 55, 100, 0],
  ['Green', 0, 100, 8], ['Cyan', 0, 100, 100], ['Lt Blue', 25, 65, 100], ['Blue', 0, 12, 100], ['Congo', 28, 0, 100], ['Lavender', 62, 40, 100], ['Magenta', 100, 0, 100], ['Pink', 100, 22, 55]];
function defaultPresets() {
  const p = { 1: {}, 2: {}, 3: {}, 4: {}, 5: {} };
  [['Full', 100], ['75%', 75], ['50%', 50], ['25%', 25], ['Zero', 0]].forEach(([n, v], i) => p[1][i + 1] = { name: n, kind: 'global', vals: { dim: v } });
  [['Home', 'home'], ['Center', 'center'], ['Singer', 'singer'], ['Drums', 'drums'], ['Downstage', 'down'], ['Band', 'band'], ['Orchestra', 'orch'], ['Cross', 'cross'], ['Audience', 'audience'],
   ['Fan Audience', 'fanAud'], ['Sky Fan', 'skyFan'], ['V Out', 'vOut'], ['Screen', 'screen'], ['Tunnel', 'tunnel'], ['Straight', 'straight'], ['Ring Down', 'ringDown'], ['Ring Cone', 'ringCone'], ['Ring Sunburst', 'ringSun'], ['Ring Twist', 'ringTwist'], ['Ring Crown', 'ringCrown'], ['Converge', 'converge'], ['Wing Fan', 'wingFan'], ['Crowd', 'crowd']]
    .forEach(([n, fn], i) => p[2][i + 1] = { name: n, kind: 'fn', fn });
  GOBO_NAMES.forEach((n, i) => p[3][i + 1] = { name: n, kind: 'global', vals: { gobo: i }, gobo: i });
  p[3][9] = { name: 'Rot Slow', kind: 'global', vals: { grot: 12 } }; p[3][10] = { name: 'Rot Fast', kind: 'global', vals: { grot: 55 } }; p[3][11] = { name: 'Rot Stop', kind: 'global', vals: { grot: 0 } };
  COLORS.forEach(([n, r, g, b], i) => p[4][i + 1] = { name: n, kind: 'global', vals: { r, g, b } });
  p[5][1] = { name: 'Narrow', kind: 'fn', fn: 'zMin' }; p[5][2] = { name: 'Medium', kind: 'fn', fn: 'zMid' }; p[5][3] = { name: 'Wide', kind: 'fn', fn: 'zMax' };
  p[5][4] = { name: 'Strobe Slow', kind: 'global', vals: { strobe: 25 } }; p[5][5] = { name: 'Strobe Fast', kind: 'global', vals: { strobe: 80 } }; p[5][6] = { name: 'Shutter Open', kind: 'global', vals: { strobe: 0 } };
  return p;
}
const PFN = { ...POS, zMin: f => ({ zoom: f.T.zr[0] }), zMid: f => ({ zoom: (f.T.zr[0] + f.T.zr[1]) / 2 }), zMax: f => ({ zoom: f.T.zr[1] }) };
function presetVals(pr, f, k, n) {
  if (pr.kind === 'global') return pr.vals;
  if (pr.kind === 'fn') return PFN[pr.fn](f, k, n);
  return pr.fix && pr.fix[f.id];
}
const has = (f, a) => f.T.attrs.includes(a);
function colorTargets() {
  if (sel.length) { const ok = sel.filter(id => has(FX[id], 'r')); if (!ok.length) toast('לגופים שנבחרו אין שליטת צבע'); return ok; }
  const lit = fixtures.filter(f => has(f, 'r') && f.out.dim > 1).map(f => f.id);
  if (!lit.length) { toast('בחר קודם גופים (Group / לחיצה על הבמה) — אין כרגע גופים דולקים'); return []; }
  toast(`אין בחירה — הצבע הוחל על כל ${lit.length} הגופים הדולקים`); return lit; }

/* --- phasers --- */
const FXT = {
  circle: { name: 'Circle', feat: 'pos', size: 22 }, pan: { name: 'Pan Sweep', feat: 'pos', size: 40 }, tilt: { name: 'Tilt Bounce', feat: 'pos', size: 28 },
  bally: { name: 'Ballyhoo', feat: 'pos', size: 32 }, dimSine: { name: 'Dim Wave', feat: 'dim', size: 100 }, dimChase: { name: 'Dim Chase', feat: 'dim', size: 100 },
  dimSaw: { name: 'Swipe', feat: 'dim', size: 100 }, flash: { name: 'Random Flash', feat: 'dim', size: 100 }, rainbow: { name: 'Rainbow', feat: 'color', size: 100 }, rgbChase: { name: 'Color Chase', feat: 'color', size: 100 },
};
function fxEval(ref, f, now, out) {
  const I = ref.inst, def = FXT[I.type];
  const freq = bpm / 60 / 4 * I.rate;
  const tb = now - beatOrigin;
  const ph = (tb * freq + (I.spread / 360) * (ref.n > 1 ? ref.idx / ref.n : 0)) * Math.PI * 2;
  const S = I.size;
  switch (I.type) {
    case 'circle': out.dp = S * Math.sin(ph); out.dt = S * Math.cos(ph); break;
    case 'pan': out.dp = S * Math.sin(ph); break;
    case 'tilt': out.dt = S * Math.sin(ph); break;
    case 'bally': out.dp = S * Math.sin(ph); out.dt = S * .6 * Math.sin(2 * ph + 1); break;
    case 'dimSine': out.dim = S * (.5 + .5 * Math.sin(ph)); break;
    case 'dimChase': out.dim = S * Math.pow(.5 + .5 * Math.cos(ph), 10); break;
    case 'dimSaw': { const x = ((ph / (Math.PI * 2)) % 1 + 1) % 1; out.dim = S * Math.pow(1 - x, 3); break; }
    case 'flash': { const step = Math.floor(tb * freq * 16), fr = tb * freq * 16 - step; out.dim = (hash(step * 13.7 + f.id * 3.1) > .82 && fr < .35) ? S : 0; break; }
    case 'rainbow': { const c = hsv((((ph / (Math.PI * 2)) % 1) + 1) % 1, 1, 1); out.r = c[0] * 100; out.g = c[1] * 100; out.b = c[2] * 100; break; }
    case 'rgbChase': { const k = ((Math.floor(ph / (Math.PI * 2) * 3) % 3) + 3) % 3; out.r = k === 0 ? 100 : 0; out.g = k === 1 ? 100 : 0; out.b = k === 2 ? 100 : 0; break; }
  }
}
function rebuildProgFx() {
  prog.fx = {};
  for (const inst of prog.fxList) { const feat = FXT[inst.type].feat; inst.ids.forEach((id, idx) => prog.fx[id + '|' + feat] = { inst, idx, n: inst.ids.length }); }
}

/* --- executors / tracking --- */
function tracked(e, i) {
  if (e.cache[i]) return e.cache[i];
  const vals = {}, fx = {};
  for (let c = 0; c <= i; c++) {
    const cue = e.cues[c]; if (!cue) continue;
    for (const id in cue.vals) { const v = cue.vals[id]; vals[id] = Object.assign(vals[id] || {}, v);
      for (const a in v) delete fx[id + '|' + ATTR[a].feat]; }
    for (const inst of cue.fx || []) { const feat = FXT[inst.type].feat; inst.ids.forEach((id, idx) => fx[id + '|' + feat] = { inst, idx, n: inst.ids.length }); }
  }
  return e.cache[i] = { vals, fx };
}
const nowS = () => performance.now() / 1000;
function gotoCue(e, i, fadeOverride) {
  if (!e.cues.length) return;
  i = clamp(i, 0, e.cues.length - 1);
  const tr = tracked(e, i);
  const dur = fadeOverride != null ? fadeOverride : (e.cues[i].fade ?? 2);
  e.fade = { from: deep(e.vals), to: tr.vals, t0: nowS(), dur, paused: false };
  e.fx = tr.fx; e.cur = i; e.on = true; e.lastGo = nowS();
}
function execGo(e, dir = 1) {
  if (!e.cues.length) { toast('Executor is empty — STORE a cue first'); return; }
  if (e.fade && e.fade.paused) { e.fade.paused = false; e.fade.t0 = nowS() - e.fade.pausedAt; return; }
  if (!e.on && e.level === 0) e.level = 1;
  let n = e.cur + dir; if (n >= e.cues.length) n = 0; if (n < 0) n = e.cues.length - 1;
  gotoCue(e, n); log(`Exec ${execs.indexOf(e) + 1}: Cue ${e.cues[n].num} ${e.cues[n].name}`, 'ok');
}
function execOff(e) { e.on = false; e.cur = -1; e.vals = {}; e.fx = {}; e.fade = null; }
function execPause(e) { if (e.fade && !e.fade.paused) { e.fade.paused = true; e.fade.pausedAt = nowS() - e.fade.t0; } }
function invalidate(e) { e.cache = {}; if (e.on && e.cur >= 0) { const tr = tracked(e, e.cur); e.vals = deep(tr.vals); e.fx = tr.fx; e.fade = null; } }

function stepFades(now) {
  for (const e of allExecs) {
    const F = e.fade; if (!F) continue;
    if (F.paused) continue;
    const p = F.dur > 0 ? clamp((now - F.t0) / F.dur, 0, 1) : 1, k = p * p * (3 - 2 * p);
    if (p >= 1) { e.vals = deep(F.to); e.fade = null; continue; }
    const v = {};
    const ids = new Set([...Object.keys(F.from), ...Object.keys(F.to)]);
    for (const id of ids) {
      const a = F.from[id] || {}, b = F.to[id] || {}, o = v[id] = {};
      for (const at of new Set([...Object.keys(a), ...Object.keys(b)])) {
        let fa = a[at], fb = b[at];
        if (at === 'dim') { fa = fa ?? 0; fb = fb ?? 0; }
        else { if (fa == null) fa = fb; if (fb == null) { if (k < 1) o[at] = fa; continue; } }
        o[at] = at === 'gobo' ? (k < .5 ? fa : fb) : fa + (fb - fa) * k;
      }
    }
    e.vals = v;
  }
}

/* --- output computation --- */
const fxTmp = {};
function computeOutput(now) {
  const active = allExecs.filter(e => e.on && (e.level > 0 || e.flash)).sort((a, b) => a.lastGo - b.lastGo);
  for (const f of fixtures) {
    const o = f.out, T = f.T;
    o.dim = 0; o.pan = f.fixed ? f.fixed.pan : 0; o.tilt = f.fixed ? f.fixed.tilt : 0; o.r = o.g = o.b = 100; if (T.defColor) [o.r, o.g, o.b] = T.defColor; o.zoom = T.z0; o.gobo = 0; o.grot = 0; o.strobe = 0;
    if (f.type === 'screen') o.gobo = 1;
    const fxSel = { pos: null, dim: null, color: null };
    for (const e of active) {
      const lv = (e.flash ? 1 : e.level) * (e.auto && (f.type === 'beam' || f.type === 'spot') ? autoPump : 1), v = e.vals[f.id];
      if (v) for (const a in v) { if (a === 'dim') o.dim = Math.max(o.dim, v.dim * lv); else o[a] = v[a]; }
      for (const ft of ['pos', 'dim', 'color']) { const r = e.fx[f.id + '|' + ft]; if (r) fxSel[ft] = { r, lv }; }
    }
    if (f.type === 'blinder' && autoHitUntil > now && autoExec.on) o.dim = Math.max(o.dim, 100 * autoExec.level);
    const pv = prog.vals[f.id];
    if (pv) for (const a in pv) { o[a] = pv[a]; fxSel[ATTR[a].feat] = null; }
    for (const ft of ['pos', 'dim', 'color']) { const r = prog.fx[f.id + '|' + ft]; if (r) fxSel[ft] = { r, lv: 1 }; }
    Object.assign(f.base, o);
    for (const ft in fxSel) { const s = fxSel[ft]; if (!s) continue;
      fxTmp.dp = fxTmp.dt = 0; fxEval(s.r, f, now, fxTmp);
      if (ft === 'pos' && T.moving) { o.pan += fxTmp.dp; o.tilt += fxTmp.dt; }
      if (ft === 'dim' && has(f, 'dim')) o.dim = fxTmp.dim * s.lv;
      if (ft === 'color' && has(f, 'r')) { o.r = fxTmp.r; o.g = fxTmp.g; o.b = fxTmp.b; } }
    if (T.tiltOnly) o.pan = 0;   // a bar has no pan axis: never let a stray pan value turn its beam out of its tilt plane
    if (highlight && f.sel) { o.dim = 100; o.r = o.g = o.b = 100; o.strobe = 0; o.gobo = f.type === 'screen' ? 0 : 0; }
    o.dim *= blackout ? 0 : gm;
  }
}

/* ====================================================================
   VISUAL UPDATE
==================================================================== */
const tmpD = new V3(), tmpP = new V3(), tmpQ = new THREE.Quaternion(), camDir = new V3(), mBasis = new THREE.Matrix4(), tU = new V3(), tV = new V3(), NZ = new V3(0, 0, 1);
function hitSurface(o, d) {
  let best = null;
  { const den = d.y - (VEN.RISE / VEN.RUN) * d.z; if (Math.abs(den) > 1e-4) { const t = ((o.z - VEN.Z1) * VEN.RISE / VEN.RUN - o.y) / den;
    if (t > 0) { const x = o.x + d.x * t, z = o.z + d.z * t; if (Math.abs(x) < VEN.X && z > VEN.Z1 && z < VEN.Z1 + VEN.STEPS * VEN.RUN) best = { t, n: TIER_N }; } } }
  if (d.y < -1e-4) {
    let t = (DECK - o.y) / d.y;
    if (t > 0) { const x = o.x + d.x * t, z = o.z + d.z * t; if (x > STAGE.x0 && x < STAGE.x1 && z > STAGE.z0 && z < STAGE.z1 && o.y > DECK) best = { t, n: UP }; }
    if (!best) { t = -o.y / d.y; const x = o.x + d.x * t, z = o.z + d.z * t;
      if (t > 0 && (!best || t < best.t) && !(x > STAGE.x0 && x < STAGE.x1 && z > STAGE.z0 && z < STAGE.z1) && Math.abs(x) < VEN.X && z < VEN.Z1 && z > STAGE.z0 - 6) best = { t, n: UP }; }
  }
  if (d.z < -1e-4 && o.z > SCREEN.z) {
    const t = (SCREEN.z + .05 - o.z) / d.z;
    if (t > 0 && (!best || t < best.t)) { const x = o.x + d.x * t, y = o.y + d.y * t; if (x > SCREEN.x0 - 5 && x < SCREEN.x1 + 5 && y > DECK && y < 27) best = { t, n: NZ }; }
  }
  return best;
}
const stageAcc = new THREE.Color(), audAcc = { v: 0 }, keyCand = [];
function updateVisuals(now, dt) {
  camDir.copy(camera.position);
  stageAcc.setRGB(0, 0, 0); let aud = 0; keyCand.length = 0; for (const z of audZones) z.c.setRGB(0, 0, 0);
  for (const f of fixtures) {
    const o = f.out, T = f.T, v = f.vis, vo = f.vo;
    let I = clamp(o.dim / 100, 0, 1);
    if (o.strobe > .5) { const hz = 1 + o.strobe / 100 * 22; I *= ((now * hz) % 1) < .22 ? 1 : 0; }
    if (f.type === 'screen') {
      screenU.uDim.value = I; screenU.uCol.value.setRGB(o.r / 100, o.g / 100, o.b / 100); screenU.uMode.value = Math.round(o.gobo); screenU.uSpd.value = o.grot; screenU.uT.value = now; timeU.value = now;
      scrLight.color.setRGB(o.r / 100, o.g / 100, o.b / 100); scrLight.intensity = I * 9; ledStrip.material.color.setRGB(o.r / 100 * I * 2, o.g / 100 * I * 2, o.b / 100 * I * 2); continue;
    }
    if (T.moving) { const k = 1 - Math.exp(-dt * 9); v.pan += (o.pan - v.pan) * k; v.tilt += (o.tilt - v.tilt) * k; }
    else { v.pan = o.pan; v.tilt = o.tilt; }
    v.gang += o.grot * dt * .05;
    dirFrom(f, v.pan, v.tilt, tmpD);
    if (vo.tiltG) { vo.yoke.rotation.y = T.tiltOnly ? 0 : (vo.flip ? -1 : 1) * v.pan * D2R; vo.tiltG.rotation.x = -v.tilt * D2R; } else vo.pivot.quaternion.setFromUnitVectors(DOWN, tmpD);
    const col = [o.r / 100, o.g / 100, o.b / 100];
    vo.bodyMat.emissive.setHex(f.sel ? 0x7a5a00 : 0x000000);
    vo.lensMat.color.setRGB(.03 + col[0] * I * 3, .03 + col[1] * I * 3, .03 + col[2] * I * 3);
    if (vo.pix) vo.pix.material.color.setRGB(.02 + col[0] * I * 2.2, .02 + col[1] * I * 2.2, .02 + col[2] * I * 2.2);
    const on = I > .004;
    vo.beam.visible = vo.pool.visible = vo.glow.visible = on;
    if (!on) continue;
    tmpP.copy(f.pos).addScaledVector(tmpD, vo.lensOff + .02);
    const zoom = clamp(o.zoom, T.zr[0], T.zr[1]), tz = Math.tan(zoom / 2 * D2R);
    const hit = hitSurface(tmpP, tmpD), L = hit ? hit.t : 85;
    // beam
    const bm = vo.beam, bu = vo.bu;
    bm.position.copy(tmpP); bm.quaternion.setFromUnitVectors(DOWN, tmpD); const rr = Math.max(L * tz, .02); bm.scale.set(rr, L, rr);
    bu.uColor.value.setRGB(col[0], col[1], col[2]);
    bu.uInt.value = I * T.power * (T.beamK ?? 1) * .38 * clamp(Math.pow(14 / (zoom + 4), .8), .06, 2.2);
    bu.uLen.value = L; bu.uEnd.value = hit ? 0 : 1;
    const gob = has(f, 'gobo') ? Math.round(o.gobo) : 0; bu.uGobo.value = gob; bu.uGRot.value = v.gang;
    // pool
    const pl = vo.pool;
    if (hit) {
      pl.visible = true;
      const r = L * tz, n = hit.n, cosA = Math.abs(tmpD.dot(n));
      tU.copy(tmpD).addScaledVector(n, -tmpD.dot(n)); if (tU.lengthSq() < 1e-6) tU.set(1, 0, 0).cross(n).normalize(); else tU.normalize();
      tV.crossVectors(n, tU); mBasis.makeBasis(tU, tV, n); pl.quaternion.setFromRotationMatrix(mBasis);
      pl.position.copy(tmpP).addScaledVector(tmpD, L).addScaledVector(n, .015 + (f.id % 7) * .002);
      pl.scale.set(r / Math.max(cosA, .22), r, 1);
      if (!vo.poolTex[gob]) { vo.poolTex[gob] = goboTex[gob].clone(); vo.poolTex[gob].needsUpdate = true; }
      const tx = vo.poolTex[gob]; tx.rotation = v.gang; if (pl.material.map !== tx) { pl.material.map = tx; pl.material.needsUpdate = true; }
      const pI = I * T.power * .3 / (1 + r * .1) * (n === NZ ? .45 : (L > 24 ? .45 : 1));
      pl.material.color.setRGB(col[0] * pI, col[1] * pI, col[2] * pI);
      if (n === UP && L < 40 && hit && T.shape !== 'blinder') keyCand.push({ f, sc: I * T.power * (T.moving ? 1 : .6), I, col, zoom, L, p: tmpP.clone(), d: tmpD.clone() });
      const hz_ = tmpP.z + tmpD.z * L;
      if (hz_ > 4) { const hx = tmpP.x + tmpD.x * L, w = I * T.power * (T.shape === 'wash' ? 1.4 : 1) * clamp(zoom / 12, .35, 2.5), zi = hx < -13 ? 0 : hx > 13 ? 2 : 1;
        audZones[zi].c.r += col[0] * w; audZones[zi].c.g += col[1] * w; audZones[zi].c.b += col[2] * w; }
      else if (n === UP && L < 30) stageAcc.r += col[0] * I * T.power, stageAcc.g += col[1] * I * T.power, stageAcc.b += col[2] * I * T.power;
    } else pl.visible = false;
    if (f.type === 'blinder') aud += I;
    // lens glow
    const gl = vo.glow; gl.position.copy(tmpP);
    tU.subVectors(camDir, tmpP); const dist = tU.length(); tU.divideScalar(dist);
    const facing = Math.max(0, tmpD.dot(tU)), coneCos = Math.cos(Math.max(zoom, 8) / 2 * D2R * 1.6);
    const into = facing > coneCos ? Math.pow((facing - coneCos) / (1 - coneCos), 2) : 0;
    const gs = vo.s * (1.1 + 4.5 * into) * Math.sqrt(I) * (T.glowK ?? 1);
    gl.scale.set(gs, gs, 1);
    const gI = (.3 + .75 * into) * I;
    gl.material.color.setRGB(col[0] * gI, col[1] * gI, col[2] * gI);
  }
  const sm = Math.max(stageAcc.r, stageAcc.g, stageAcc.b);
  if (sm > 0) { stageLight.color.setRGB(stageAcc.r / sm, stageAcc.g / sm, stageAcc.b / sm); stageLight.intensity = Math.min(sm * .12, 6); } else stageLight.intensity = 0;
  audLight.intensity = aud * 4;
  for (const z of audZones) { const m = Math.max(z.c.r, z.c.g, z.c.b); if (m > 0) { z.L.color.setRGB(z.c.r / m, z.c.g / m, z.c.b / m); z.L.intensity = Math.min(m * 4.5, 70); } else z.L.intensity = 0; z.L.intensity += aud * 6; }
  houseLights.forEach((L, i) => L.intensity = houseLevel * (i === 2 ? 500 : 1100));
  if (WALL_LIGHT.l) WALL_LIGHT.l.intensity = 0;
  keyCand.sort((a, b) => b.sc - a.sc);
  for (let i = 0; i < KEY_N; i++) { const L = keyLights[i], c = keyCand[i];
    if (!c || !lightsOn) { L.intensity = 0; continue; }
    L.position.copy(c.p); L.target.position.copy(c.p).addScaledVector(c.d, c.L); L.target.updateMatrixWorld();
    L.angle = Math.min(clamp(c.zoom, 4, 60) / 2 * D2R * 1.15, 1.2); L.penumbra = c.f.type === 'wash' ? .85 : .35;
    L.color.setRGB(c.col[0], c.col[1], c.col[2]); L.intensity = c.I * c.f.T.power * 450 * clamp(12 / (c.zoom + 6), .25, 1.6); }
}

/* ====================================================================
   PROGRAMMER OPERATIONS
==================================================================== */
function setSel(ids, mode = 'replace') {
  ids = ids.filter(id => FX[id]);
  if (mode === 'replace') sel = [...new Set(ids)];
  else if (mode === 'add') { for (const id of ids) if (!sel.includes(id)) sel.push(id); }
  else if (mode === 'sub') sel = sel.filter(id => !ids.includes(id));
  else if (mode === 'toggle') { for (const id of ids) sel = sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id]; }
  fixtures.forEach(f => f.sel = false); sel.forEach(id => FX[id].sel = true);
  uiDirty.sel = true;
}
function progSet(id, attr, val) {
  const f = FX[id]; if (!f || !has(f, attr)) return;
  const A = ATTR[attr]; let mn = A.min, mx = A.max;
  if (attr === 'zoom') { mn = f.T.zr[0]; mx = f.T.zr[1]; }
  val = clamp(val, mn, mx); if (A.step) val = Math.round(val);
  (prog.vals[id] = prog.vals[id] || {})[attr] = +(+val).toFixed(2);
}
function progRemoveFeat(ids, feat) {
  for (const id of ids) { const v = prog.vals[id]; if (v) { for (const a of FEAT_ATTRS[feat] || []) delete v[a]; if (!Object.keys(v).length) delete prog.vals[id]; } }
  for (const inst of prog.fxList) if (FXT[inst.type].feat === feat) inst.ids = inst.ids.filter(id => !ids.includes(id));
  prog.fxList = prog.fxList.filter(i => i.ids.length); rebuildProgFx();
}
function applyPreset(type, slot) {
  const pr = presets[type][slot]; if (!pr) return;
  const ids = type === 4 ? colorTargets() : sel;
  if (!ids.length) { if (type !== 4) toast('בחר קודם גופים (Select fixtures first)'); return; }
  ids.forEach((id, k) => { const f = FX[id], v = presetVals(pr, f, k, ids.length); if (!v) return; for (const a in v) progSet(id, a, v[a]); });
  if (type === 2) { /* position preset also tidies running pos phasers */ }
  log(`Preset ${type}.${slot} "${pr.name}"`, 'ok');
}
function applyFx(type) {
  if (!sel.length) { toast('בחר קודם גופים (Select fixtures first)'); return; }
  const def = FXT[type], feat = def.feat;
  for (const inst of prog.fxList) if (FXT[inst.type].feat === feat) inst.ids = inst.ids.filter(id => !sel.includes(id));
  const ids = sel.filter(id => feat === 'pos' ? FX[id].T.moving : feat === 'color' ? has(FX[id], 'r') : has(FX[id], 'dim'));
  if (!ids.length) { toast('Selected fixtures do not support this phaser'); return; }
  prog.fxList = prog.fxList.filter(i => i.ids.length);
  prog.fxList.push({ type, rate: 1, size: def.size, spread: 360, ids: [...ids] });
  rebuildProgFx(); log(`Phaser ${def.name} → ${ids.length} fixtures`, 'ok');
}
function selFxInsts() { return prog.fxList.filter(i => i.ids.some(id => sel.includes(id))); }
function clearProg() { prog.vals = {}; prog.fxList = []; rebuildProgFx(); }
let lastClear = 0;
function doClear() {
  const t = performance.now();
  if (t - lastClear < 400) { setSel([]); clearProg(); highlight = false; log('Clear All', 'ok'); }
  else if (sel.length) { setSel([]); log('Clear Selection'); }
  else { clearProg(); highlight = false; log('Clear Programmer'); }
  lastClear = t; uiDirty.all = true;
}
function progHasContent() { return Object.keys(prog.vals).length || prog.fxList.length; }

/* store */
function storeCue(ei, num, opts = {}) {
  const e = execs[ei];
  if (!progHasContent()) { log('Store: programmer is empty', 'er'); return; }
  if (num == null) num = e.cues.length ? Math.floor(e.cues[e.cues.length - 1].num) + 1 : 1;
  let cue = e.cues.find(c => c.num === num);
  if (cue && !opts.merge) { cue.vals = {}; cue.fx = []; }
  if (!cue) { cue = { num, name: opts.name || `Cue ${num}`, fade: opts.fade ?? 2, vals: {}, fx: [] }; e.cues.push(cue); e.cues.sort((a, b) => a.num - b.num); }
  for (const id in prog.vals) cue.vals[id] = Object.assign(cue.vals[id] || {}, deep(prog.vals[id]));
  // cue-local phasers: remove stored fixtures from same-feature phasers in this cue, then add
  for (const inst of prog.fxList) { const ft = FXT[inst.type].feat;
    for (const old of cue.fx) if (FXT[old.type].feat === ft) old.ids = old.ids.filter(id => !inst.ids.includes(id));
    cue.fx = cue.fx.filter(i => i.ids.length); cue.fx.push(deep(inst)); }
  if (opts.fade != null) cue.fade = opts.fade;
  if (!e.name) e.name = `Seq ${ei + 1}`;
  invalidate(e);
  log(`Stored Cue ${num} in Exec ${ei + 1} (${e.name})`, 'ok'); toast(`Cue ${num} stored → Exec ${ei + 1}`);
  uiDirty.all = true; persist();
}
function storeGroup(slot) {
  if (!sel.length) { log('Store Group: nothing selected', 'er'); return; }
  groups[slot] = { name: groups[slot]?.name || `Group ${slot}`, ids: [...sel] };
  log(`Stored Group ${slot}`, 'ok'); renderPools(); persist();
}
function storePreset(type, slot) {
  const feats = PT_FEAT[type], fix = {};
  for (const id of sel) { const v = prog.vals[id]; if (!v) continue; const o = {};
    for (const ft of feats) for (const a of FEAT_ATTRS[ft]) if (v[a] != null) o[a] = v[a];
    if (Object.keys(o).length) fix[id] = o; }
  if (!Object.keys(fix).length) { log(`Store Preset: no ${PRESET_TYPES[type]} values in programmer for selection`, 'er'); return; }
  presets[type][slot] = { name: presets[type][slot]?.name && presets[type][slot].kind === 'fix' ? presets[type][slot].name : `${PRESET_TYPES[type]} ${slot}`, kind: 'fix', fix };
  log(`Stored Preset ${type}.${slot}`, 'ok'); renderPools(); persist();
}
function setStore(on) { storeMode = on; $('#kStore').classList.toggle('on', on); document.body.classList.toggle('storing', on); if (on) log('STORE — click an executor, cue, group or preset slot (or type)'); }

/* ====================================================================
   COMMAND LINE
==================================================================== */
const ALIAS = { f: 'fixture', fi: 'fixture', fix: 'fixture', fixture: 'fixture', ch: 'fixture', channel: 'fixture', g: 'group', gr: 'group', group: 'group', t: 'thru', thru: 'thru', through: 'thru',
  at: 'at', full: 'full', zero: 'zero', st: 'store', store: 'store', q: 'cue', cue: 'cue', seq: 'exec', sequence: 'exec', exec: 'exec', executor: 'exec', ex: 'exec', e: 'exec',
  c: 'clear', clear: 'clear', ca: 'clearall', clearall: 'clearall', del: 'delete', delete: 'delete', p: 'preset', pr: 'preset', preset: 'preset', hl: 'highlight', highlight: 'highlight',
  bo: 'blackout', blackout: 'blackout', go: 'go', goplus: 'go', gominus: 'goback', goback: 'goback', goto: 'goto', pause: 'pause', label: 'label', fade: 'fade', off: 'off', '+': '+', '-': '-', all: 'all' };
function log(msg, cls = '') { const fb = $('#cmdFb'); const d = el('div', '', ''); d.innerHTML = `<span class="${cls}">${msg}</span>`; fb.appendChild(d); while (fb.children.length > 2) fb.firstChild.remove(); }
function runCmd(raw) {
  let s = raw.trim(); if (!s) return;
  s = s.replace(/go\s*\+/ig, 'goplus ').replace(/go\s*-/ig, 'gominus ').replace(/@/g, ' at ').replace(/\+/g, ' + ').replace(/\s-\s?/g, ' - ').replace(/^-/, ' - ');
  const orig = s.split(/\s+/).filter(Boolean), T = orig.map(w => w.toLowerCase());
  let i = 0, mode = 'replace', selected = false;
  const word = () => ALIAS[T[i]] || (isNaN(parseFloat(T[i])) ? T[i] : '#');
  const num = () => { const v = parseFloat(T[i]); if (isNaN(v)) throw `Expected a number after "${T[i - 1] || ''}"`; i++; return v; };
  const ids = () => { const a = num(); if (T[i] && ALIAS[T[i]] === 'thru') { i++; const b = num(); return range(Math.min(a, b), Math.max(a, b)); } return [a]; };
  const selectIds = list => { if (!list.length) throw 'No fixtures match'; setSel(list, mode === 'replace' && !selected ? 'replace' : mode === 'sub' ? 'sub' : 'add'); selected = true; mode = 'replace'; };
  try {
    while (i < T.length) {
      const w = word();
      if (w === '#') { selectIds(ids()); continue; }
      i++;
      switch (w) {
        case 'fixture': selectIds(ids()); break;
        case 'group': { const n = num(); if (!groups[n]) throw `Group ${n} is empty`; selectIds([...groups[n].ids]); break; }
        case 'all': selectIds(fixtures.filter(f => f.type !== 'screen').map(f => f.id)); break;
        case '+': mode = 'add'; selected = true; break;
        case '-': mode = 'sub'; selected = true; break;
        case 'at': case 'full': case 'zero': {
          let v; if (w === 'full') v = 100; else if (w === 'zero') v = 0; else { const nx = ALIAS[T[i]]; if (nx === 'full') { v = 100; i++; } else if (nx === 'zero') { v = 0; i++; } else v = num(); }
          if (!sel.length) throw 'No selection'; sel.forEach(id => progSet(id, 'dim', v)); log(`${sel.length} fixtures At ${v}`, 'ok'); break; }
        case 'store': {
          const k = word();
          if (k === 'group') { i++; storeGroup(num()); }
          else if (k === 'preset') { i++; const [a, b] = String(T[i++]).split('.').map(Number); if (!presets[a] || !b) throw 'Use Store Preset 4.12'; storePreset(a, b); }
          else { if (k === 'cue') i++; let n = null, fade, ex = selExec; if (word() === '#') n = num();
            while (i < T.length) { const kk = word(); if (kk === 'fade') { i++; fade = num(); } else if (kk === 'exec') { i++; ex = num() - 1; } else break; }
            if (!execs[ex]) throw 'No such executor'; storeCue(ex, n, { fade }); }
          setStore(false); break; }
        case 'exec': { selExec = clamp(num() - 1, 0, 9); uiDirty.all = true; log(`Exec ${selExec + 1} selected`, 'ok'); break; }
        case 'go': { let ex = selExec; if (word() === 'exec') { i++; ex = num() - 1; } execGo(execs[ex], 1); break; }
        case 'goback': { let ex = selExec; if (word() === 'exec') { i++; ex = num() - 1; } execGo(execs[ex], -1); break; }
        case 'goto': { if (word() === 'cue') i++; const n = num(); const e = execs[selExec]; const idx = e.cues.findIndex(c => c.num === n); if (idx < 0) throw `Cue ${n} not found`; if (!e.on && e.level === 0) e.level = 1; gotoCue(e, idx); log(`Goto Cue ${n}`, 'ok'); break; }
        case 'pause': execPause(execs[selExec]); break;
        case 'off': { let ex = selExec; if (word() === 'exec') { i++; ex = num() - 1; } execOff(execs[ex]); log(`Exec ${ex + 1} Off`, 'ok'); break; }
        case 'clear': doClear(); break;
        case 'clearall': setSel([]); clearProg(); highlight = false; log('Clear All', 'ok'); break;
        case 'preset': { const [a, b] = String(T[i++]).split('.').map(Number); if (!presets[a] || !presets[a][b]) throw 'Preset not found'; applyPreset(a, b); break; }
        case 'delete': { if (word() === 'cue') i++; const n = num(); const e = execs[selExec]; const idx = e.cues.findIndex(c => c.num === n); if (idx < 0) throw `Cue ${n} not found`; e.cues.splice(idx, 1); invalidate(e); if (e.cur >= e.cues.length) e.cur = e.cues.length - 1; log(`Deleted Cue ${n}`, 'ok'); persist(); break; }
        case 'label': { const k = word(); i++; const n = num(); const name = orig.slice(i).join(' ').replace(/^"|"$/g, ''); i = T.length;
          if (k === 'cue') { const c = execs[selExec].cues.find(c => c.num === n); if (!c) throw 'Cue not found'; c.name = name; }
          else if (k === 'group') { if (!groups[n]) throw 'Group empty'; groups[n].name = name; renderPools(); }
          else if (k === 'exec') { execs[n - 1].name = name; } else throw 'Label Cue|Group|Exec n Name';
          log(`Labelled ${k} ${n}: ${name}`, 'ok'); persist(); break; }
        case 'highlight': highlight = !highlight; break;
        case 'blackout': blackout = !blackout; break;
        case 'fade': { const n = num(); const e = execs[selExec]; if (e.cur >= 0) { e.cues[e.cur].fade = n; log(`Cue fade = ${n}s`, 'ok'); } break; }
        default: throw `Unknown keyword "${orig[i - 1]}"`;
      }
    }
    if (selected && !T.some(t => ['at', 'full', 'zero'].includes(ALIAS[t]))) log(`${sel.length} fixtures selected`, 'ok');
  } catch (err) { log(String(err), 'er'); }
  uiDirty.all = true;
}

/* ====================================================================
   UI
==================================================================== */
const uiDirty = { all: true, sel: true };
// side tabs
let sideTab = 'pools';
$$('#sideTabs button').forEach(b => b.onclick = () => { sideTab = b.dataset.t; $$('#sideTabs button').forEach(x => x.classList.toggle('on', x === b)); $$('.pane').forEach(p => p.classList.toggle('on', p.id === 'pane-' + sideTab)); uiDirty.all = true; });
$$('[data-view]').forEach(b => b.onclick = () => setView(b.dataset.view));

/* pools */
let presetTab = 4;
const GROUP_SLOTS = 48;   // a full grid: 6 x 8 in Desk/Classic, 12 x 4 in the MA layout
const NEW_GROUPS = ['LED Bars', 'Follow Spots', 'Profiles'];
function renderPools() {
  const gp = $('#groupPool'); gp.innerHTML = '';
  for (let n = 1; n <= GROUP_SLOTS; n++) {
    const g = groups[n], d = el('div', 'slot grp' + (g ? '' : ' empty'), `<span class="n">${n}</span><span class="t">${g ? g.name : '—'}</span>`);
    if (g) d.title = `${g.ids.length} fixtures`;
    d.onclick = ev => { if (storeMode) { storeGroup(n); setStore(false); return; } if (!g) return; setSel([...g.ids], ev.shiftKey ? 'add' : 'replace'); log(`Group ${n} "${g.name}" (${g.ids.length})`, 'ok'); };
    d.ondblclick = () => { if (!g) return; openRename(`Group ${n}`, g.name, v => { g.name = v; renderPools(); persist(); }); };
    gp.appendChild(d);
  }
  const pt = $('#presetTabs'); pt.innerHTML = '';
  for (const t in PRESET_TYPES) { const b = el('button', +t === presetTab ? 'on' : '', `${t} ${PRESET_TYPES[t]}`); b.onclick = () => { presetTab = +t; renderPools(); }; pt.appendChild(b); }
  const pp = $('#presetPool'); pp.innerHTML = '';
  for (let n = 1; n <= 30; n++) {
    const pr = presets[presetTab][n];
    const d = el('div', 'slot' + (pr ? '' : ' empty'), `<span class="n">${presetTab}.${n}</span><span class="t">${pr ? pr.name : '—'}</span>`);
    if (pr && presetTab === 4 && pr.vals) { const c = `rgb(${pr.vals.r * 2.55},${pr.vals.g * 2.55},${pr.vals.b * 2.55})`; const sw = el('i', 'sw'); sw.style.background = c; sw.style.color = c; d.appendChild(sw); }
    if (pr && presetTab === 3 && pr.gobo != null) { const im = el('img', 'gi'); im.src = goboIcons[pr.gobo]; d.appendChild(im); }
    d.onclick = () => { if (storeMode) { storePreset(presetTab, n); setStore(false); return; } if (pr) applyPreset(presetTab, n); };
    d.ondblclick = () => { if (!pr) return; openRename(`Preset ${presetTab}.${n}`, pr.name, v => { pr.name = v; renderPools(); persist(); }); };
    pp.appendChild(d);
  }
}

/* feature tabs + encoders */
let feat = 'dim';
function renderFeatTabs() {
  const ft = $('#featTabs'); ft.innerHTML = '';
  for (const [k, n] of FEATS) { const b = el('button', k === feat ? 'on' : '', n); b.dataset.f = k; b.onclick = () => { feat = k; renderFeatTabs(); renderEncoders(); }; ft.appendChild(b); }
}
const ENC_DEF = {
  dim: ['dim'], pos: ['pan', 'tilt'], gobo: ['gobo', 'grot'], color: ['r', 'g', 'b'], beam: ['zoom', 'strobe'],
  fx: ['rate', 'size', 'spread'],
};
const FXP = { rate: { label: 'Rate', min: .125, max: 8, unit: 'x' }, size: { label: 'Size', min: 0, max: 180, unit: '' }, spread: { label: 'Phase', min: 0, max: 1440, unit: '°' } };
function encRange(a) { return ATTR[a] || FXP[a]; }
// the MA console keeps all five encoders live: current feature first, then other attributes in this fixed order
const ENC_FILL = ['dim', 'pan', 'tilt', 'r', 'g', 'b', 'zoom', 'strobe', 'gobo', 'grot'];
function encList() { const L = ENC_DEF[feat]; return deskMode === 'ma' ? [...L, ...ENC_FILL.filter(a => !L.includes(a))].slice(0, Math.max(5, L.length)) : L; }
function renderEncoders() {
  const E = $('#encoders'); E.innerHTML = '';
  for (const a of encList()) {
    const R = encRange(a);
    const d = el('div', 'encoder', `<div class="lb">${R.label}</div><div class="knob"><div class="ind"></div></div><div class="val">—</div>`);
    d.dataset.a = a; E.appendChild(d);
    const knob = d.querySelector('.knob'), stp = ATTR[a]?.step;
    let lastY = 0, map = null, rem = 0;
    // stepped attributes (gobo) collect the fractions of a drag until they make a whole step
    const turn = v => { if (!stp) { encDelta(a, v); return; } rem += v; const n = Math.trunc(rem / stp) * stp; if (n) { rem -= n; encDelta(a, n); } };
    knob.onpointerdown = ev => { knob.setPointerCapture(ev.pointerId); map = boxMap(knob); lastY = map(ev)[1] * map.h; rem = 0; ev.preventDefault(); };
    knob.onpointermove = ev => { if (!knob.hasPointerCapture(ev.pointerId)) return; const y = map(ev)[1] * map.h, dy = lastY - y; lastY = y; turn(dy * (R.max - R.min) / 320 * (ev.shiftKey ? .1 : 1)); };
    knob.onwheel = ev => { ev.preventDefault(); const s = -Math.sign(ev.deltaY); if (stp) encDelta(a, s * stp); else encDelta(a, s * (R.max - R.min) / 100 * (ev.shiftKey ? .1 : 1)); };
    d.querySelector('.val').ondblclick = () => openNumber(R.label, v => encAbs(a, v));
  }
  renderEncExtra();
}
function encDelta(a, d) {
  if (!sel.length && ['r', 'g', 'b'].includes(a)) { const ids = colorTargets(); if (!ids.length) return; setSel(ids); }
  if (!sel.length) { toast('בחר קודם גופים (Select fixtures first)'); return; }
  if (a in FXP) { const insts = selFxInsts(); if (!insts.length) { toast('No phaser on selection'); return; } for (const I of insts) I[a] = clamp(I[a] + d, FXP[a].min, FXP[a].max); return; }
  const n = sel.length;
  sel.forEach((id, k) => { const f = FX[id]; if (!has(f, a)) return; const cur = prog.vals[id]?.[a] ?? f.base[a] ?? ATTR[a].def;
    const m = fanMode && n > 1 ? lerp(-1, 1, k / (n - 1)) : 1; progSet(id, a, cur + d * m); });
}
function encAbs(a, v) {
  if (a in FXP) { for (const I of selFxInsts()) I[a] = clamp(v, FXP[a].min, FXP[a].max); return; }
  sel.forEach(id => progSet(id, a, v));
}
function fmtVal(a, v) { if (v == null) return '—'; if (a === 'gobo') return feat === 'gobo' && sel.length && FX[sel[0]].type === 'screen' ? SCREEN_MODES[Math.round(v)] : `${Math.round(v)} ${GOBO_NAMES[Math.round(v)] || ''}`; const R = encRange(a); return (Math.abs(v) < 10 && a !== 'dim' ? (+v).toFixed(1) : Math.round(v)) + (R.unit || ''); }
function updateEncUI() {
  const f0 = sel.map(id => FX[id])[0];
  $$('#encoders .encoder').forEach(d => {
    const a = d.dataset.a, R = encRange(a); let v = null, p = false, en = true;
    if (a in FXP) { const I = selFxInsts()[0]; en = !!I; if (I) { v = I[a]; p = true; } }
    else { const f = sel.map(id => FX[id]).find(f => has(f, a)); en = !!f; if (f) { const pv = prog.vals[f.id]?.[a]; p = pv != null; v = p ? pv : f.base[a]; } }
    d.classList.toggle('dis', !en && sel.length > 0);
    const vv = d.querySelector('.val'); vv.textContent = fmtVal(a, v); vv.classList.toggle('p', p);
    const k = v == null ? 0 : (v - R.min) / (R.max - R.min);
    d.querySelector('.knob').style.setProperty('--kv', (clamp(k, 0, 1) * 270) + 'deg');
    d.querySelector('.knob').style.setProperty('--kc', p ? '#ff4040' : '#ffc21a');
    d.querySelector('.ind').style.transform = `rotate(${-135 + clamp(k, 0, 1) * 270}deg)`;
  });
  // feature dots
  $$('#featTabs button').forEach(b => { const ft = b.dataset.f; let hasP = false;
    if (ft === 'fx') hasP = prog.fxList.length > 0; else for (const id in prog.vals) if (FEAT_ATTRS[ft].some(a => prog.vals[id][a] != null)) { hasP = true; break; }
    b.classList.toggle('has', hasP); });
}
function btnGrid(cols, items) { const g = el('div', 'btnGrid'); g.style.gridTemplateColumns = `repeat(${cols},auto)`; for (const [t, fn, cls] of items) { const b = el('button', cls || '', t); b.onclick = fn; g.appendChild(b); } return g; }
// Pointer -> position in the element's own untransformed border box (0..1), correct under the MA console's CSS 3D
// perspective and zoom: zero-size probes at the four corners give the projected quad, and the inverse of the
// square-to-quad homography maps the pointer back. Built once per gesture, so a drag never forces layout per move.
function boxMap(elm) {
  const own = !(elm instanceof HTMLCanvasElement), host = own ? elm : elm.offsetParent, w = elm.offsetWidth, h = elm.offsetHeight;
  const ox = own ? -elm.clientLeft : elm.offsetLeft, oy = own ? -elm.clientTop : elm.offsetTop;
  const pr = [[0, 0], [w, 0], [w, h], [0, h]].map(([x, y]) => { const i = document.createElement('i');
    i.style.cssText = `position:absolute;display:block;left:${ox + x}px;top:${oy + y}px;width:0;height:0;margin:0;padding:0;border:0;transform:none`; host.appendChild(i); return i; });
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = pr.map(i => { const r = i.getBoundingClientRect(); return [r.left, r.top]; }); pr.forEach(i => i.remove());
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3, dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3, den = dx1 * dy2 - dx2 * dy1;
  if (!den || !isFinite(den)) { const r = elm.getBoundingClientRect(), f = ev => [(ev.clientX - r.left) / r.width, (ev.clientY - r.top) / r.height]; f.w = r.width; f.h = r.height; return f; }
  const g = (dx3 * dy2 - dx2 * dy3) / den, k = (dx1 * dy3 - dx3 * dy1) / den, a = x1 - x0 + g * x1, b = x3 - x0 + k * x3, d = y1 - y0 + g * y1, e = y3 - y0 + k * y3;
  const A = e - y0 * k, B = x0 * k - b, C = b * y0 - x0 * e, D = y0 * g - d, E = a - x0 * g, F = x0 * d - a * y0, G = d * k - e * g, H = b * g - a * k, I = a * e - b * d;
  const z = elm.currentCSSZoom || 1, f = ev => { const X = ev.clientX, Y = ev.clientY, q = G * X + H * Y + I; return [(A * X + B * Y + C) / q, (D * X + E * Y + F) / q]; };
  f.w = w * z; f.h = h * z; return f;
}
// pads are built once for the MA touch screens and per feature change inside #encExtra for the other layouts
let aimH = 1.4;
function focusPad(c) {
  const mx = x => (x + 25) / 50 * c.width, mz = z => (z + 22) / 28 * c.height, ix = px => px / c.width * 50 - 25, iz = py => py / c.height * 28 - 22;
  const draw = (pt) => { const x = c.getContext('2d'); x.fillStyle = '#050506'; x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = '#16161a'; x.fillRect(mx(STAGE.x0), mz(STAGE.z0), mx(STAGE.x1) - mx(STAGE.x0), mz(STAGE.z1) - mz(STAGE.z0));
    x.fillStyle = '#1f2a44'; x.fillRect(mx(SCREEN.x0), mz(SCREEN.z) - 2, mx(SCREEN.x1) - mx(SCREEN.x0), 3);
    x.strokeStyle = '#3a3a44'; x.beginPath(); x.ellipse(mx(RING.x), mz(RING.z), RING.R / 50 * c.width, RING.R / 28 * c.height, 0, 0, 7); x.stroke();
    x.fillStyle = '#555'; for (const [px, pz] of [...BAND_PTS, ...[-21.6, -19.5, -17.4, -15.3, -13.3, 13.3, 15.3, 17.4, 19.5, 21.6].flatMap(x => [[x, -8.7], [x, -11.6], [x, -14.6]])]) { x.beginPath(); x.arc(mx(px), mz(pz), 3, 0, 7); x.fill(); }
    x.fillStyle = '#ffc21a88'; for (const id of sel) { const f = FX[id]; x.fillRect(mx(f.pos.x) - 1, mz(f.pos.z) - 1, 2, 2); }
    x.fillStyle = '#888'; x.font = '9px Inter'; x.fillText('UPSTAGE', 4, 10); x.fillText('AUDIENCE ↓', 4, c.height - 4);
    if (pt) { x.strokeStyle = '#ff4040'; x.beginPath(); x.arc(pt[0], pt[1], 6, 0, 7); x.moveTo(pt[0] - 10, pt[1]); x.lineTo(pt[0] + 10, pt[1]); x.moveTo(pt[0], pt[1] - 10); x.lineTo(pt[0], pt[1] + 10); x.stroke(); } };
  draw();
  let map = null;
  const aim = ev => { const [u, v] = map(ev), px = u * c.width, py = v * c.height; const X3 = ix(px), Z3 = iz(py), on = X3 > STAGE.x0 && X3 < STAGE.x1 && Z3 > STAGE.z0 && Z3 < STAGE.z1;
    const Y3 = (on ? DECK : 0) + aimH; sel.forEach(id => { const f = FX[id]; if (!f.T.moving) return; const a = aimAt(f, X3, Y3, Z3); progSet(id, 'pan', a.pan); progSet(id, 'tilt', a.tilt); }); draw([px, py]); };
  c.onpointerdown = ev => { if (!sel.length) { toast('בחר קודם גופים (Select fixtures first)'); return; } c.setPointerCapture(ev.pointerId); map = boxMap(c); aim(ev); };
  c.onpointermove = ev => { if (c.hasPointerCapture(ev.pointerId)) aim(ev); };
  return draw;
}
function colorPad(c) {
  const x = c.getContext('2d'); for (let px = 0; px < c.width; px++) for (let py = 0; py < c.height; py++) { const [r, g, b] = hsv(px / c.width, 1 - py / c.height, 1); x.fillStyle = `rgb(${r * 255},${g * 255},${b * 255})`; x.fillRect(px, py, 1, 1); }
  const pick = ev => { const [u, v] = map(ev), h = clamp(u, 0, 1), s = clamp(1 - v, 0, 1); const [r, g, b] = hsv(h, s, 1); pickIds.forEach(id => { progSet(id, 'r', r * 100); progSet(id, 'g', g * 100); progSet(id, 'b', b * 100); }); };
  let pickIds = [], map = null;
  c.onpointerdown = ev => { pickIds = colorTargets(); if (!pickIds.length) return; c.setPointerCapture(ev.pointerId); map = boxMap(c); pick(ev); };
  c.onpointermove = ev => { if (c.hasPointerCapture(ev.pointerId)) pick(ev); };
}
function renderEncExtra() {
  const X = $('#encExtra'); X.innerHTML = '';
  const knock = () => { progRemoveFeat(sel, feat); log(`Knockout ${feat} from selection`); };
  if (feat === 'dim') {
    const w = el('div'); w.appendChild(el('div', 'xlabel', 'Quick level')); w.appendChild(btnGrid(6, [['Full', () => encAbs('dim', 100)], ['75', () => encAbs('dim', 75)], ['50', () => encAbs('dim', 50)], ['25', () => encAbs('dim', 25)], ['10', () => encAbs('dim', 10)], ['Zero', () => encAbs('dim', 0)]]));
    X.appendChild(w); const w2 = el('div'); w2.appendChild(el('div', 'xlabel', 'Programmer')); w2.appendChild(btnGrid(1, [['Knockout Dimmer', knock]])); X.appendChild(w2);
    X.appendChild(el('div', 'hint', 'Drag the encoder up/down (Shift = fine), mouse-wheel, or double-click the value to type. Command line: <b>At 75</b>, <b>Full</b>.'));
  }
  if (feat === 'pos') {
    if (deskMode !== 'ma') { const w = el('div'); w.appendChild(el('div', 'xlabel', 'Focus pad — click/drag on the stage map to aim selection'));
      const c = el('canvas', 'pad'); c.width = 300; c.height = 118; w.appendChild(c); X.appendChild(w); focusPad(c); }
    const hRow = el('div'); hRow.appendChild(el('div', 'xlabel', 'Aim height')); const hs = el('input'); hs.type = 'range'; hs.min = 0; hs.max = 12; hs.step = .1; hs.value = aimH; hs.style.width = '120px'; hs.oninput = () => aimH = +hs.value; hRow.appendChild(hs);
    hRow.appendChild(el('div', 'xlabel', '&nbsp;')); hRow.appendChild(btnGrid(2, [['Home', () => sel.forEach(id => { progSet(id, 'pan', 0); progSet(id, 'tilt', 0); })], ['Knockout', knock], ['Fan ' + (fanMode ? 'ON' : 'off'), () => { fanMode = !fanMode; $('#kFan').classList.toggle('on', fanMode); renderEncExtra(); }, fanMode ? 'on' : ''], ['Center', () => applyPreset(2, 2)]]));
    X.appendChild(hRow);
  }
  if (feat === 'gobo') {
    const w = el('div'); const isScreen = sel.length && FX[sel[0]].type === 'screen';
    w.appendChild(el('div', 'xlabel', isScreen ? 'LED screen content' : 'Gobo wheel'));
    const r = el('div', 'goboRow');
    if (isScreen) SCREEN_MODES.forEach((n, i) => { const b = el('button', '', `<span style="font-size:11px">${n}</span>`); b.style.width = '70px'; b.onclick = () => encAbs('gobo', i); r.appendChild(b); });
    else GOBO_NAMES.forEach((n, i) => { const b = el('button', '', `<img src="${goboIcons[i]}">${n}`); b.onclick = () => encAbs('gobo', i); r.appendChild(b); });
    w.appendChild(r); X.appendChild(w);
    const w2 = el('div'); w2.appendChild(el('div', 'xlabel', 'Rotation')); w2.appendChild(btnGrid(2, [['◀ Fast', () => encAbs('grot', -60)], ['Fast ▶', () => encAbs('grot', 60)], ['◀ Slow', () => encAbs('grot', -12)], ['Slow ▶', () => encAbs('grot', 12)], ['Stop', () => encAbs('grot', 0)], ['Knockout', knock]])); X.appendChild(w2);
  }
  if (feat === 'color') {
    if (deskMode !== 'ma') { const w = el('div'); w.appendChild(el('div', 'xlabel', 'Color picker'));
      const c = el('canvas', 'pad'); c.width = 230; c.height = 112; w.appendChild(c); X.appendChild(w); colorPad(c); }
    const w2 = el('div'); w2.appendChild(el('div', 'xlabel', 'Swatches (Color presets 4.x)')); const sw = el('div', 'swatches');
    COLORS.forEach(([n, r, g, b]) => { const d = el('div'); d.title = n; d.style.background = `rgb(${r * 2.55},${g * 2.55},${b * 2.55})`; d.onclick = () => colorTargets().forEach(id => { progSet(id, 'r', r); progSet(id, 'g', g); progSet(id, 'b', b); }); sw.appendChild(d); });
    w2.appendChild(sw); w2.appendChild(el('div', 'xlabel', '&nbsp;')); w2.appendChild(btnGrid(2, [['Knockout Color', knock]])); X.appendChild(w2);
  }
  if (feat === 'beam') {
    const w = el('div'); w.appendChild(el('div', 'xlabel', 'Beam / Shutter'));
    w.appendChild(btnGrid(3, [['Narrow', () => applyPresetTo(5, 1)], ['Medium', () => applyPresetTo(5, 2)], ['Wide', () => applyPresetTo(5, 3)], ['Strobe Slow', () => encAbs('strobe', 25)], ['Strobe Fast', () => encAbs('strobe', 80)], ['Open', () => encAbs('strobe', 0)], ['Knockout', knock]]));
    X.appendChild(w);
  }
  if (feat === 'fx') {
    const w = el('div'); w.appendChild(el('div', 'xlabel', 'Phaser templates — applied to the selection, ordered by selection (Phase = spread)'));
    const g = el('div', 'fxGrid'); for (const k in FXT) { const b = el('button', '', FXT[k].name); b.onclick = () => applyFx(k); g.appendChild(b); } w.appendChild(g); X.appendChild(w);
    const w2 = el('div'); w2.appendChild(el('div', 'xlabel', 'Selection'));
    w2.appendChild(btnGrid(1, [['Remove Phasers', () => { for (const inst of prog.fxList) inst.ids = inst.ids.filter(id => !sel.includes(id)); prog.fxList = prog.fxList.filter(i => i.ids.length); rebuildProgFx(); }], ['Phase 0°', () => encAbs('spread', 0)], ['Phase 360°', () => encAbs('spread', 360)], ['Phase 720°', () => encAbs('spread', 720)]]));
    X.appendChild(w2);
  }
}
function applyPresetTo(t, n) { applyPreset(t, n); }

/* executors */
function faderDrag(elm, get, set) {
  let map = null;
  const upd = ev => set(clamp(1 - map(ev)[1], 0, 1));
  elm.onpointerdown = ev => { elm.setPointerCapture(ev.pointerId); map = boxMap(elm); upd(ev); ev.preventDefault(); };
  elm.onpointermove = ev => { if (elm.hasPointerCapture(ev.pointerId)) upd(ev); };
  elm.ondblclick = () => set(get() > .5 ? 0 : 1);
}
function setLevel(e, v) {
  const was = e.level; e.level = v;
  if (v > 0 && !e.on && e.cues.length) gotoCue(e, Math.max(0, e.cur));
  if (v === 0 && was > 0 && !e.flash) execOff(e);
}
function buildExecs() {
  const X = $('#execs'); X.innerHTML = '';
  execs.slice(0, 10).forEach((e, i) => {
    const d = el('div', 'ex', `<div class="ex-top"><span class="ex-num">${i + 1}</span><span class="ex-name"></span><button class="ex-off" title="Off">⏻</button><button class="ex-sel" title="Select">SEL</button></div>
      <div class="ex-cue"><span class="c"></span><span class="x"></span></div>
      <div class="ex-mid"><div class="fader"><div class="ff"></div><div class="cap"></div></div><div class="ex-btns"><button class="b-go">GO+</button><button class="b-back">GO−</button><button class="b-flash">FLASH</button></div></div>
      <div class="ex-lvl"></div>`);
    X.appendChild(d); e.dom = d;
    const sel_ = () => { selExec = i; uiDirty.all = true; };
    d.querySelector('.ex-name').onclick = d.querySelector('.ex-sel').onclick = () => { if (storeMode) { storeCue(i, null); setStore(false); } sel_(); };
    d.querySelector('.ex-name').ondblclick = () => openRename(`Executor ${i + 1}`, e.name, v => { e.name = v; persist(); });
    d.querySelector('.ex-off').onclick = () => { execOff(e); e.level = i === 0 ? e.level : 0; };
    d.querySelector('.b-go').onclick = () => { if (storeMode) { storeCue(i, null); setStore(false); sel_(); return; } sel_(); execGo(e, 1); };
    d.querySelector('.b-back').onclick = () => { sel_(); execGo(e, -1); };
    const fl = d.querySelector('.b-flash');
    fl.onpointerdown = () => { if (!e.cues.length) return; e.flash = true; if (!e.on) { e.flashOnly = true; gotoCue(e, Math.max(0, e.cur), 0); } e.lastGo = nowS(); fl.classList.add('on'); };
    const flUp = () => { if (!e.flash) return; e.flash = false; fl.classList.remove('on'); if (e.flashOnly && e.level === 0) execOff(e); e.flashOnly = false; };
    fl.onpointerup = flUp; fl.onpointerleave = flUp;
    faderDrag(d.querySelector('.fader'), () => e.level, v => { e.flashOnly = false; setLevel(e, v); });
  });
}
function updateExecUI() {
  execs.forEach((e, i) => {
    const d = e.dom; d.classList.toggle('sel', i === selExec); d.classList.toggle('on', e.on);
    d.querySelector('.ex-name').textContent = e.name || (e.cues.length ? `Seq ${i + 1}` : 'empty');
    const c = e.cues[e.cur], nx = e.cues.length ? e.cues[(e.cur + 1) % e.cues.length] : null;
    d.querySelector('.c').textContent = c ? `${c.num} ${c.name}` : (e.cues.length ? `${e.cues.length} cues` : '');
    d.querySelector('.x').textContent = nx && e.on ? `› ${nx.num} ${nx.name}` : '';
    d.querySelector('.ff').style.height = (e.level * 100) + '%'; d.querySelector('.cap').style.bottom = (e.level * 100) + '%';
    d.querySelector('.ex-lvl').textContent = Math.round(e.level * 100) + '%'; d.style.setProperty('--lv', e.level);
  });
  const e = execs[selExec];
  $('#mSelName').textContent = `${selExec + 1} ${e.name || ''}`;
  $('#hudExec').textContent = `Exec ${selExec + 1} · ${e.name || 'empty'}`;
  const c = e.cues[e.cur]; $('#hudCue').innerHTML = c ? `<span>${c.num}</span> ${c.name}` : (e.cues.length ? 'Off — press GO' : 'No cues');
  const nx = e.cues.length > 1 ? e.cues[(e.cur + 1) % e.cues.length] : null; $('#hudNext').textContent = nx ? `Next: ${nx.num} ${nx.name}  (fade ${nx.fade}s)` : '';
  if (auto.on) { $('#hudExec').textContent = 'AUTO SHOW · ' + STYLES[auto.style].name; $('#hudCue').innerHTML = `<span>●</span> ${SEC_NAMES[auto.sec] || ''}`; const nb = autoBars(), bf = (nowS() - beatOrigin) * bpm / 240; $('#hudNext').textContent = `${bpm} BPM · new look every ${nb} bars`; $('#hudBar').style.width = (((bf % nb) + nb) % nb) / nb * 100 + '%'; return; }
  const F = e.fade; $('#hudBar').style.width = F ? (clamp((F.paused ? F.pausedAt : nowS() - F.t0) / (F.dur || 1), 0, 1) * 100) + '%' : (e.on ? '100%' : '0');
  $('#pauseBtn').classList.toggle('on', !!(F && F.paused));
}
/* GM fader */
faderDrag($('#gmFader'), () => gm, v => gm = v);

/* sequence pane */
function renderSeq() {
  const s = $('#seqSel'); s.innerHTML = execs.map((e, i) => `<option value="${i}" ${i === selExec ? 'selected' : ''}>Exec ${i + 1} — ${e.name || 'empty'} (${e.cues.length})</option>`).join('');
  const e = execs[selExec], t = $('#seqTable');
  t.innerHTML = `<tr><th>Cue</th><th>Name</th><th>Fade</th><th>Content</th></tr>` + e.cues.map((c, i) => {
    const nf = Object.keys(c.vals).length, nx = (c.fx || []).length;
    return `<tr data-i="${i}" class="${i === e.cur ? 'cur' : (e.on && i === (e.cur + 1) % e.cues.length) ? 'nxt' : ''}"><td class="num">${c.num}</td><td class="name">${c.name}</td><td class="fade">${c.fade}s</td><td class="info">${nf} fix${nx ? ` · ${nx} fx` : ''}</td></tr>`; }).join('');
  if (!e.cues.length) t.innerHTML += `<tr><td colspan="4" style="color:var(--mut);padding:14px">No cues. Build a look in the programmer, then STORE → click this executor (or type <b>Store Cue 1</b>).</td></tr>`;
  $$('#seqTable tr[data-i]').forEach(tr => {
    const i = +tr.dataset.i, c = e.cues[i];
    tr.onclick = ev => { if (ev.detail > 1) return; if (storeMode) { storeCue(selExec, c.num, { merge: true }); setStore(false); return; } if (!e.on && e.level === 0) e.level = 1; gotoCue(e, i); uiDirty.all = true; };
    tr.querySelector('.name').ondblclick = () => openRename(`Cue ${c.num}`, c.name, v => { c.name = v; uiDirty.all = true; persist(); });
    tr.querySelector('.fade').ondblclick = () => openNumber(`Fade time for cue ${c.num} (s)`, v => { c.fade = Math.max(0, v); uiDirty.all = true; persist(); });
  });
}
$('#seqSel').onchange = ev => { selExec = +ev.target.value; uiDirty.all = true; };
$('#seqGo').onclick = () => execGo(execs[selExec], 1);
$('#seqBack').onclick = () => execGo(execs[selExec], -1);
$('#seqDel').onclick = () => { const e = execs[selExec]; if (e.cur < 0) { toast('Goto the cue you want to delete first'); return; } runCmd(`Delete Cue ${e.cues[e.cur].num}`); };

/* fixture sheet */
// rows are built only when the fixture list changes; each tick writes just the cells whose text or class changed
let sheetRows = null;
function renderSheet() {
  const t = $('#sheet');
  if (!sheetRows || sheetRows.length !== fixtures.length) {
    t.innerHTML = `<tr><th>ID</th><th>Type</th><th>Dim</th><th>Pan</th><th>Tilt</th><th>Col</th><th>Gobo</th><th>Zoom</th></tr>` +
      fixtures.map(f => `<tr data-id="${f.id}"><td>${f.id}</td><td style="font-family:Inter">${f.T.name}</td><td></td><td></td><td></td><td><span class="cs"></span></td><td></td><td></td></tr>`).join('');
    sheetRows = [...t.querySelectorAll('tr[data-id]')].map(tr => ({ tr, td: tr.cells, cs: tr.querySelector('.cs'), v: {} }));
  }
  fixtures.forEach((f, i) => {
    const R = sheetRows[i], o = f.base, p = prog.vals[f.id] || {}, c = (a) => p[a] != null ? 'p' : '', V = R.v;
    const put = (k, v, fn) => { if (V[k] !== v) { V[k] = v; fn(v); } };
    put('sel', f.sel ? 'sel' : '', v => R.tr.className = v);
    const cells = [[2, 'dim', String(Math.round(f.out.dim))], [3, 'pan', has(f, 'pan') ? String(Math.round(o.pan)) : ''], [4, 'tilt', has(f, 'tilt') ? String(Math.round(o.tilt)) : ''],
      [6, 'gobo', has(f, 'gobo') ? String(Math.round(o.gobo)) : ''], [7, 'zoom', has(f, 'zoom') ? (+o.zoom).toFixed(1) : '']];
    for (const [n, a, txt] of cells) { put('t' + n, txt, v => R.td[n].textContent = v); put('c' + n, c(a), v => R.td[n].className = v); }
    put('c5', c('r'), v => R.td[5].className = v);
    put('sw', has(f, 'r') ? `rgb(${o.r * 2.55},${o.g * 2.55},${o.b * 2.55})` : '#333', v => R.cs.style.background = v);
  });
}
$('#sheet').onclick = ev => { const tr = ev.target.closest('tr[data-id]'); if (tr) setSel([+tr.dataset.id], ev.shiftKey ? 'toggle' : 'replace'); };

/* keys */
$('#kStore').onclick = () => setStore(!storeMode);
$('#kClear').onclick = doClear;
$('#kHigh').onclick = () => { highlight = !highlight; };
$('#kFan').onclick = () => { fanMode = !fanMode; if (feat === 'pos') renderEncExtra(); };
$('#kAll').onclick = () => setSel(fixtures.filter(f => f.type !== 'screen').map(f => f.id));
$('#kOdd').onclick = () => setSel(sel.filter((_, i) => i % 2 === 0));
$('#kEven').onclick = () => setSel(sel.filter((_, i) => i % 2 === 1));
$('#kRev').onclick = () => { sel.reverse(); setSel([...sel]); log('Selection order reversed'); };
$('#goBig').onclick = () => execGo(execs[selExec], 1);
$('#goBack').onclick = () => execGo(execs[selExec], -1);
$('#pauseBtn').onclick = () => execPause(execs[selExec]);
$('#offBtn').onclick = () => execOff(execs[selExec]);
$('#boBtn').onclick = () => { blackout = !blackout; };
let taps = [];
$('#tapBtn').onclick = () => { const t = performance.now(); taps = taps.filter(x => t - x < 2500); taps.push(t); beatOrigin = t / 1000; if (taps.length >= 2) { const iv = (taps[taps.length - 1] - taps[0]) / (taps.length - 1); bpm = clamp(Math.round(60000 / iv), 40, 220); } };
$('#haze').oninput = ev => hazeU.value = ev.target.value / 100;
$('#house').oninput = ev => houseLevel = ev.target.value / 100;
$('#glowBtn').onclick = ev => { glowOn = !glowOn; ev.target.classList.toggle('on', glowOn); };
$('#realBtn').onclick = ev => { lightsOn = !lightsOn; renderer.shadowMap.enabled = lightsOn; ev.target.classList.toggle('on', lightsOn); };
let showIds = false; $('#idsBtn').onclick = ev => { showIds = !showIds; ev.target.classList.toggle('on', showIds); };

/* command line + keyboard */
const cmd = $('#cmd');
const hist = []; let hi = -1;
cmd.onkeydown = ev => {
  if (ev.key === 'Enter') { const v = cmd.value; if (v.trim()) { hist.unshift(v); hi = -1; } if (/^\s*store\s*$/i.test(v)) { setStore(true); cmd.value = ''; return; } runCmd(v); cmd.value = ''; ev.preventDefault(); }
  else if (ev.key === 'Escape') { cmd.value = ''; cmd.blur(); setStore(false); }
  else if (ev.key === 'ArrowUp') { hi = Math.min(hi + 1, hist.length - 1); if (hist[hi]) cmd.value = hist[hi]; ev.preventDefault(); }
  else if (ev.key === 'ArrowDown') { hi = Math.max(hi - 1, -1); cmd.value = hi >= 0 ? hist[hi] : ''; ev.preventDefault(); }
};
document.addEventListener('keydown', ev => {
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  if ($('#guide').classList.contains('show') || tIdx >= 0) return;
  if ($('#modal').classList.contains('show')) { if (ev.key === 'Escape') closeModal(); return; }
  if (ev.code === 'Space') { ev.preventDefault(); execGo(execs[selExec], 1); return; }
  if (ev.key === 'Escape') { setStore(false); return; }
  if (ev.key.length === 1 && !ev.ctrlKey && !ev.metaKey) { cmd.focus(); }
});

/* modal helpers */
function openModal(html, rtl) { const b = $('#mbox'); b.className = 'mbox' + (rtl ? ' rtl' : ''); b.innerHTML = html; $('#modal').classList.add('show'); }
function closeModal() { $('#modal').classList.remove('show'); }
$('#modal').onclick = ev => { if (ev.target.id === 'modal') closeModal(); };
function openRename(title, val, cb) {
  openModal(`<h2>Label ${title}</h2><input id="mIn" style="width:100%;background:#000;color:#fff;border:1px solid #444;border-radius:4px;padding:8px;font:14px Inter" value="${(val || '').replace(/"/g, '&quot;')}"><div class="row"><button id="mOk" class="on">OK</button><button id="mCancel">Cancel</button></div>`);
  const i = $('#mIn'); i.focus(); i.select(); const ok = () => { cb(i.value.trim() || val); closeModal(); uiDirty.all = true; };
  $('#mOk').onclick = ok; $('#mCancel').onclick = closeModal; i.onkeydown = e => { if (e.key === 'Enter') ok(); if (e.key === 'Escape') closeModal(); };
}
function openNumber(title, cb) {
  openModal(`<h2>${title}</h2><input id="mIn" type="number" step="any" style="width:100%;background:#000;color:#fff;border:1px solid #444;border-radius:4px;padding:8px;font:14px 'JetBrains Mono'"><div class="row"><button id="mOk" class="on">Set</button><button id="mCancel">Cancel</button></div>`);
  const i = $('#mIn'); i.focus(); const ok = () => { const v = parseFloat(i.value); if (!isNaN(v)) cb(v); closeModal(); uiDirty.all = true; };
  $('#mOk').onclick = ok; $('#mCancel').onclick = closeModal; i.onkeydown = e => { if (e.key === 'Enter') ok(); if (e.key === 'Escape') closeModal(); };
}
$('#helpBtn').onclick = () => openGuide(0);
document.addEventListener('click', ev => { if (ev.target.id === 'hClose') closeModal(); });

/* ====================================================================
   SHOW FILE (save / load)
==================================================================== */
const LS = 'lumadesk-show-v6';
function serialize() {
  return { v: 1, groups, presets: Object.fromEntries(Object.entries(presets).map(([t, m]) => [t, Object.fromEntries(Object.entries(m).filter(([, p]) => p.kind !== 'fn'))])),
    execs: execs.map(e => ({ name: e.name, cues: e.cues, level: e.level })), bpm, haze: hazeU.value };
}
function loadShow(d) {
  groups = d.groups || defaultGroups(); presets = defaultPresets();
  // shows saved before the LED Bars / Follow Spots / Profiles groups existed: add them, but only into slots that are still empty
  if (d.groups) { const dg = defaultGroups(); for (const n in dg) if (NEW_GROUPS.includes(dg[n].name) && !groups[n]) groups[n] = dg[n]; }
  for (const t in d.presets || {}) for (const s in d.presets[t]) presets[t][s] = d.presets[t][s];
  execs.forEach((e, i) => { execOff(e); const x = (d.execs || [])[i] || {}; e.name = x.name || ''; e.cues = x.cues || []; e.level = x.level ?? 0; e.cache = {}; });
  bpm = d.bpm || 120; hazeU.value = d.haze ?? .62; $('#haze').value = hazeU.value * 100;
  clearProg(); setSel([]); renderPools(); uiDirty.all = true;
}
let persistT; function persist() { clearTimeout(persistT); persistT = setTimeout(() => { try { localStorage.setItem(LS, JSON.stringify(serialize())); } catch (e) { } }, 500); }
$('#fileBtn').onclick = () => {
  openModal(`<button class="close" id="hClose">✕</button><h2>Show File</h2>
  <p>The show auto-saves in this browser. To move it to another computer, copy the JSON and paste it there.</p>
  <div class="row"><button id="fSave" class="on">⬇ Download show file</button><button id="fCopy">Copy show JSON</button><button id="fDemo">Reload demo show</button><button id="fNew">New empty show</button></div>
  <h3>Import</h3><textarea id="fTxt" placeholder="Paste show JSON here…"></textarea>
  <div class="row"><button id="fImp" class="on">Load pasted show</button><label style="display:flex;align-items:center;gap:6px;color:var(--mut)">or file: <input type="file" id="fFile" accept=".json,application/json"></label></div>`);
  $('#fSave').onclick = () => { downloadBlob(new Blob([JSON.stringify(serialize(), null, 1)], { type: 'application/json' }), `luma-show-${stamp()}.json`); toast('קובץ המופע ירד'); };
  $('#fCopy').onclick = async () => { const s = JSON.stringify(serialize()); try { await navigator.clipboard.writeText(s); toast('Show copied to clipboard'); } catch (e) { $('#fTxt').value = s; $('#fTxt').select(); toast('Copy blocked — JSON shown in the box, copy it manually'); } };
  $('#fDemo').onclick = () => { buildDemo(); closeModal(); toast('Demo show loaded'); };
  $('#fNew').onclick = () => { loadShow({ groups: defaultGroups() }); persist(); closeModal(); toast('New show'); };
  $('#fImp').onclick = () => { try { loadShow(JSON.parse($('#fTxt').value)); persist(); closeModal(); toast('Show loaded'); } catch (e) { toast('Invalid JSON'); } };
  $('#fFile').onchange = ev => { const f = ev.target.files[0]; if (!f) return; f.text().then(t => { try { loadShow(JSON.parse(t)); persist(); closeModal(); toast('Show loaded'); } catch (e) { toast('Invalid file'); } }); };
};

/* ====================================================================
   DEMO SHOW
==================================================================== */
function buildDemo() {
  groups = defaultGroups(); presets = defaultPresets();
  const V = (spec) => { const vals = {}; for (const [ids, v] of spec) ids.forEach((id, k) => { const f = FX[id]; if (!f) return; let o = typeof v === 'function' ? v(f, k, ids.length) : typeof v === 'string' ? PFN[v](f, k, ids.length) : v;
    const out = vals[id] = vals[id] || {}; for (const a in o) if (has(f, a)) out[a] = a === 'zoom' ? clamp(o[a], f.T.zr[0], f.T.zr[1]) : o[a]; }); return vals; };
  const M = (...objs) => Object.assign({}, ...objs.map(o => typeof o === 'string' ? {} : o));
  const P = (name) => (f, k, n) => PFN[name](f, k, n);
  const C = (n) => { const c = COLORS.find(x => x[0] === n); return { r: c[1], g: c[2], b: c[3] }; };
  const both = (pos, extra) => (f, k, n) => ({ ...PFN[pos](f, k, n), ...extra });
  const G = n => groups[n].ids;
  const FXI = (type, ids, o = {}) => ({ type, rate: 1, size: FXT[type].size, spread: 360, ids, ...o });
  const allMovers = fixtures.filter(f => f.T.moving).map(f => f.id);
  const SCR = [2001];
  const cues = [];
  cues.push({ num: 1, name: 'Walk-In', fade: 3, vals: V([
    [fixtures.filter(f => f.type !== 'screen').map(f => f.id), { dim: 0, gobo: 0, grot: 0, strobe: 0 }],
    [allMovers, (f, k, n) => ({ ...PFN.center(f, k, n), ...C('Blue') })],
    [G(3), { dim: 32, zoom: 40 }], [G(6), { dim: 22, ...C('Congo') }], [G(9), { dim: 70, ...C('Congo') }],
    [G(7), (f) => ({ pan: 0, tilt: 0, zoom: 2 })], [G(2), 'straight'], [G(5), 'straight'],
    [SCR, { dim: 40, r: 10, g: 20, b: 100, gobo: 1, grot: 0 }]]), fx: [] });
  cues.push({ num: 2, name: 'Intro', fade: 4, vals: V([
    [G(1), both('singer', { dim: 70, ...C('Warm'), gobo: 2, zoom: 12, grot: 6 })],
    [G(5), both('skyFan', { dim: 85, ...C('White'), zoom: 2 })],
    [G(3), { dim: 38, ...C('Congo') }],
    [SCR, { dim: 55, r: 45, g: 0, b: 100, gobo: 3, grot: 10 }]]), fx: [FXI('tilt', G(5), { size: 10, rate: .5 })] });
  cues.push({ num: 3, name: 'Verse', fade: 2.5, vals: V([
    [G(3), { dim: 70, ...C('Amber'), zoom: 30 }], [G(6), both('band', { dim: 60, ...C('Magenta') })], [G(9), { dim: 85, ...C('Magenta') }],
    [G(4), both('cross', { dim: 65, ...C('Lavender'), gobo: 1, zoom: 18, grot: -10 })],
    [G(7), both('straight', { dim: 45, ...C('Orange'), gobo: 0 })],
    [G(5), { dim: 0 }], [G(1), { dim: 60, ...C('Warm') }],
    [SCR, { dim: 50, r: 100, g: 45, b: 0, gobo: 6, grot: 5 }]]), fx: [FXI('dimSine', G(7), { size: 70, rate: .5, spread: 720 })] });
  cues.push({ num: 4, name: 'Pre-Chorus', fade: 1.5, vals: V([
    [G(7), both('skyFan', { dim: 80, ...C('Cyan'), zoom: 2 })],
    [G(2), both('fanAud', { dim: 75, ...C('White'), zoom: 2 })],
    [G(3), { dim: 55, ...C('Cyan') }], [G(9), { ...C('Blue') }], [G(4), { dim: 0 }],
    [SCR, { dim: 70, r: 0, g: 80, b: 100, gobo: 2, grot: 30 }]]), fx: [FXI('tilt', G(2), { size: 18, rate: 1, spread: 360 })] });
  cues.push({ num: 5, name: 'Chorus', fade: .3, vals: V([
    [G(2), { dim: 100, ...C('White') }], [G(5), both('fanAud', { dim: 100, ...C('White'), zoom: 2 })], [G(7), { dim: 100, ...C('White') }],
    [G(3), { dim: 95, ...C('Red'), zoom: 22 }], [G(6), { dim: 90, ...C('Red') }], [G(9), { dim: 100, ...C('Red') }],
    [G(1), both('audience', { dim: 85, ...C('White'), gobo: 3, zoom: 14, grot: 35 })],
    [G(8), both('vOut', { dim: 80, ...C('Red'), zoom: 18 })],
    [SCR, { dim: 90, r: 100, g: 0, b: 0, gobo: 2, grot: 60 }]]),
    fx: [FXI('bally', G(2), { size: 30, rate: 1 }), FXI('circle', G(5), { size: 16, rate: 1, spread: 360 }), FXI('tilt', G(7), { size: 22, rate: 2, spread: 360 })] });
  cues.push({ num: 6, name: 'Rainbow Bridge', fade: 1, vals: V([[SCR, { dim: 80, r: 100, g: 100, b: 100, gobo: 3, grot: 40 }], [G(1), { dim: 0 }]]),
    fx: [FXI('rainbow', [...G(2), ...G(5)], { rate: .5, spread: 360 }), FXI('rainbow', [...G(7)], { rate: .5, spread: 720 }), FXI('rainbow', [...G(3), ...G(6)], { rate: .25, spread: 360 }), FXI('circle', G(7), { size: 18, rate: .5, spread: 720 })] });
  cues.push({ num: 7, name: 'Breakdown', fade: 3, vals: V([
    [[...G(2), ...G(5), ...G(1), ...G(4), ...G(8)], { dim: 0 }],
    [G(3), both('center', { dim: 35, ...C('Blue') })], [G(6), { dim: 25, ...C('Blue') }], [G(9), { dim: 45, ...C('Blue') }],
    [G(7), both('skyFan', { dim: 60, ...C('Lt Blue') })],
    [SCR, { dim: 20, r: 0, g: 20, b: 100, gobo: 4, grot: 0 }]]), fx: [FXI('dimChase', G(7), { rate: 1, spread: 360 })] });
  cues.push({ num: 8, name: 'DROP!', fade: 0, vals: V([
    [G(11), { dim: 100, strobe: 88 }], [G(10), { dim: 55 }],
    [[...G(2), ...G(5), ...G(7)], { dim: 100, ...C('White'), zoom: 2 }],
    [G(2), 'fanAud'], [G(5), 'audience'], [G(7), 'skyFan'],
    [G(3), { dim: 100, ...C('White'), zoom: 50, strobe: 45 }], [G(6), { dim: 100, ...C('White') }],
    [SCR, { dim: 100, r: 100, g: 100, b: 100, gobo: 7, grot: 80 }]]),
    fx: [FXI('bally', [...G(2), ...G(5)], { size: 40, rate: 2 }), FXI('flash', G(7), { rate: 1 })] });
  cues.push({ num: 9, name: 'Outro', fade: 5, vals: V([
    [[...G(11), ...G(10), ...G(2), ...G(5), ...G(7), ...G(6), ...G(9)], { dim: 0, strobe: 0 }],
    [G(3), both('center', { dim: 45, ...C('CTO'), strobe: 0 })],
    [G(1), both('singer', { dim: 75, ...C('Warm'), gobo: 0, zoom: 9, grot: 0 })],
    [SCR, { dim: 30, r: 100, g: 50, b: 10, gobo: 1, grot: 0 }]]), fx: [] });
  const RB = G(24), RW = G(25), AB = G(26), AS = G(27);
  const addTo = (num, spec, fx = []) => { const c = cues.find(c => c.num === num), v = V(spec); for (const id in v) c.vals[id] = Object.assign(c.vals[id] || {}, v[id]); c.fx.push(...fx); };
  addTo(1, [[RB, both('ringDown', { dim: 22, ...C('Congo'), zoom: 2 })], [RW, both('ringCone', { dim: 25, ...C('Blue'), zoom: 30 })], [[...AB, ...AS], { dim: 0 }]], [FXI('dimSine', RB, { size: 60, rate: .25, spread: 360 })]);
  addTo(2, [[RB, both('ringDown', { dim: 90, ...C('White'), zoom: 2 })], [RW, { dim: 40, ...C('Congo') }], [AB, both('ringCrown', { dim: 45, ...C('Lt Blue'), zoom: 2 })]], [FXI('circle', RB, { size: 6, rate: .5, spread: 360 })]);
  addTo(3, [[RB, { dim: 0 }], [RW, both('band', { dim: 65, ...C('Amber'), zoom: 26 })], [AS, both('cross', { dim: 70, ...C('Lavender'), gobo: 3, zoom: 15, grot: 14 })], [AB, { dim: 0 }]]);
  addTo(4, [[RB, both('ringCone', { dim: 95, ...C('Cyan'), zoom: 2 })], [AB, both('wingFan', { dim: 70, ...C('White'), zoom: 2 })], [AS, { dim: 0 }]], [FXI('dimChase', RB, { rate: 1, spread: 360 })]);
  addTo(5, [[RB, both('ringSun', { dim: 100, ...C('White'), zoom: 2 })], [RW, both('center', { dim: 90, ...C('Red'), zoom: 30 })], [AB, both('converge', { dim: 100, ...C('Red'), zoom: 2 })], [AS, both('audience', { dim: 80, ...C('White'), gobo: 7, zoom: 12, grot: 40 })]],
    [FXI('tilt', RB, { size: 14, rate: 1, spread: 360 }), FXI('circle', AB, { size: 10, rate: 1, spread: 360 })]);
  addTo(6, [[RB, both('ringTwist', { dim: 100, zoom: 2 })], [AB, both('ringCrown', { dim: 90, zoom: 2 })], [RW, { dim: 70 }], [AS, { dim: 0 }]],
    [FXI('rainbow', RB, { rate: .5, spread: 360 }), FXI('circle', RB, { size: 8, rate: .5, spread: 360 }), FXI('rainbow', [...AB, ...RW], { rate: .25, spread: 720 })]);
  addTo(7, [[RB, both('ringCrown', { dim: 70, ...C('Lt Blue'), zoom: 2 })], [RW, { dim: 20, ...C('Blue') }], [AB, { dim: 0 }]], [FXI('dimSine', RB, { size: 80, rate: .5, spread: 720 })]);
  addTo(8, [[RB, both('ringSun', { dim: 100, ...C('White'), zoom: 2 })], [AB, both('wingFan', { dim: 100, ...C('White'), zoom: 2 })], [AS, both('audience', { dim: 100, ...C('White'), gobo: 3, zoom: 14, grot: 60 })], [RW, { dim: 100, ...C('White'), strobe: 60 }]],
    [FXI('flash', RB, { rate: 1 }), FXI('bally', AB, { size: 36, rate: 2 })]);
  addTo(9, [[[...RB, ...AB, ...AS], { dim: 0 }], [RW, both('singer', { dim: 50, ...C('CTO'), zoom: 18, strobe: 0 })]]);
  const TB = G(31), TW = G(32);
  addTo(1, [[TB, both('straight', { dim: 0, zoom: 2 })], [TW, both('band', { dim: 30, ...C('Congo'), zoom: 30 })]]);
  addTo(2, [[TB, both('skyFan', { dim: 70, ...C('Lt Blue'), zoom: 2 })], [TW, { dim: 20 }]], [FXI('pan', TB, { size: 15, rate: .25, spread: 360 })]);
  addTo(3, [[TB, { dim: 0 }], [TW, both('band', { dim: 60, ...C('Amber'), zoom: 24 })]]);
  addTo(4, [[TB, both('ringCone', { dim: 90, ...C('Cyan'), zoom: 2 })], [TW, { dim: 50, ...C('Blue') }]], [FXI('dimChase', TB, { rate: 2, spread: 360 })]);
  addTo(5, [[TB, both('audience', { dim: 100, ...C('White'), zoom: 2 })], [TW, both('audience', { dim: 90, ...C('Red'), zoom: 40 })]], [FXI('bally', TB, { size: 25, rate: 1, spread: 180 })]);
  addTo(6, [[TB, both('skyFan', { dim: 100, zoom: 2 })], [TW, { dim: 70 }]], [FXI('rainbow', [...TB, ...TW], { rate: .5, spread: 360 }), FXI('circle', TB, { size: 14, rate: .5, spread: 360 })]);
  addTo(7, [[TB, { dim: 0 }], [TW, { dim: 25, ...C('Blue') }]]);
  addTo(8, [[TB, both('vOut', { dim: 100, ...C('White'), zoom: 2 })], [TW, { dim: 100, ...C('White'), strobe: 70 }]], [FXI('flash', TB, { rate: 1 })]);
  addTo(9, [[[...TB, ...TW], { dim: 0, strobe: 0 }]]);
  const AW = G(33);
  addTo(1, [[AW, both('crowd', { dim: 40, ...C('CTO'), zoom: 50 })]]);
  addTo(2, [[AW, { dim: 22, ...C('Blue') }]]);
  addTo(3, [[AW, { dim: 30, ...C('Amber') }]]);
  addTo(4, [[AW, { dim: 55, ...C('Cyan') }]], [FXI('dimSine', AW, { size: 70, rate: .5, spread: 360 })]);
  addTo(5, [[AW, { dim: 100, ...C('White'), zoom: 50 }]]);
  addTo(6, [[AW, { dim: 85 }]], [FXI('rainbow', AW, { rate: .5, spread: 360 })]);
  addTo(7, [[AW, { dim: 12, ...C('Blue') }]]);
  addTo(8, [[AW, { dim: 100, ...C('White'), strobe: 55 }]]);
  addTo(9, [[AW, { dim: 45, ...C('CTO'), strobe: 0 }]]);
  cues.splice(5, 0, { num: 5.5, name: 'Ring Tornado', fade: .8, vals: V([[RB, both('ringTwist', { dim: 100, ...C('Magenta'), zoom: 2 })], [RW, both('ringCone', { dim: 80, ...C('Cyan'), zoom: 18 })], [AB, both('converge', { dim: 85, ...C('Cyan'), zoom: 2 })], [G(31), both('ringCone', { dim: 100, ...C('White'), zoom: 2 })], [G(32), { dim: 60, ...C('Magenta') }], [G(33), { dim: 70, ...C('Magenta') }], [[...G(2), ...G(5), ...G(7), ...G(1), ...G(8), ...G(4)], { dim: 0 }], [G(3), { dim: 35, ...C('Congo') }], [SCR, { dim: 45, r: 100, g: 0, b: 100, gobo: 4, grot: 50 }]]),
    fx: [FXI('circle', RB, { size: 16, rate: 1, spread: 360 }), FXI('dimChase', AB, { rate: 2, spread: 360 })] });
  const ex = (i, name, cs, level = 0) => { const e = execs[i]; execOff(e); e.name = name; e.cues = cs; e.level = level; e.cache = {}; };
  execs.forEach(e => { execOff(e); e.name = ''; e.cues = []; e.level = 0; e.cache = {}; });
  ex(0, 'Main Show', cues, 1);
  ex(1, 'Blinders', [{ num: 1, name: 'Hit', fade: 0, vals: V([[G(10), { dim: 100 }]]), fx: [] }]);
  ex(2, 'Strobes', [{ num: 1, name: 'Strobe', fade: 0, vals: V([[G(11), { dim: 100, strobe: 92 }]]), fx: [] }]);
  ex(3, 'Floor Chase', [{ num: 1, name: 'Chase', fade: .5, vals: V([[G(7), both('skyFan', { ...C('White'), zoom: 2 })]]), fx: [FXI('dimChase', G(7), { rate: 2, spread: 360 })] }]);
  ex(4, 'Swipe T2', [{ num: 1, name: 'Swipe', fade: .5, vals: V([[G(2), both('fanAud', { ...C('Cyan'), zoom: 2 })]]), fx: [FXI('dimSaw', G(2), { rate: 1, spread: 360 })] }]);
  ex(5, 'Red Alert', [{ num: 1, name: 'Red', fade: 1, vals: V([[[...G(15), ...G(9)], { dim: 100, ...C('Red') }]]), fx: [] }]);
  ex(6, 'Key Light', [{ num: 1, name: 'Singer', fade: 2, vals: V([[range(108, 113), both('singer', { dim: 100, ...C('White'), gobo: 0, zoom: 8, grot: 0 })]]), fx: [] }]);
  ex(8, 'Ring FX', [
    { num: 1, name: 'Pillars', fade: 1, vals: V([[G(24), both('ringDown', { dim: 100, ...C('White'), zoom: 2 })]]), fx: [FXI('dimChase', G(24), { rate: 1, spread: 360 })] },
    { num: 2, name: 'Cone', fade: 1, vals: V([[G(24), both('ringCone', { dim: 100, ...C('Cyan'), zoom: 2 })]]), fx: [FXI('dimSine', G(24), { rate: 1, spread: 720 })] },
    { num: 3, name: 'Tornado', fade: 1, vals: V([[G(24), both('ringTwist', { dim: 100, ...C('Magenta'), zoom: 2 })]]), fx: [FXI('circle', G(24), { size: 16, rate: 1, spread: 360 })] },
    { num: 4, name: 'Sunburst', fade: 1, vals: V([[G(24), both('ringSun', { dim: 100, ...C('Amber'), zoom: 2 })]]), fx: [FXI('tilt', G(24), { size: 18, rate: 1, spread: 360 })] },
    { num: 5, name: 'Crown', fade: 1, vals: V([[G(24), both('ringCrown', { dim: 100, ...C('Lt Blue'), zoom: 2 })]]), fx: [FXI('pan', G(24), { size: 20, rate: .5, spread: 360 })] }]);
  ex(9, 'Wings', [
    { num: 1, name: 'Wing Fan', fade: 1, vals: V([[G(26), both('wingFan', { dim: 100, ...C('White'), zoom: 2 })]]), fx: [FXI('dimSaw', G(26), { rate: 1, spread: 360 })] },
    { num: 2, name: 'Converge', fade: 1, vals: V([[G(26), both('converge', { dim: 100, ...C('Red'), zoom: 2 })]]), fx: [FXI('circle', G(26), { size: 8, rate: 1, spread: 360 })] }]);
  ex(7, 'Screen Sparkle', [{ num: 1, name: 'Sparkle', fade: 1, vals: V([[SCR, { dim: 100, r: 100, g: 100, b: 100, gobo: 7, grot: 40 }]]), fx: [] }]);
  bpm = 124; hazeU.value = .62; $('#haze').value = 62;
  clearProg(); setSel([]); renderPools();
  gotoCue(execs[0], 0, 0); selExec = 0; uiDirty.all = true; persist();
}

/* ====================================================================
   VIEWPORT INTERACTION (picking, box select, tooltip)
==================================================================== */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function pickAt(cx, cy) { const r = canvas.getBoundingClientRect(); ndc.set((cx - r.left) / r.width * 2 - 1, -(cy - r.top) / r.height * 2 + 1); ray.setFromCamera(ndc, camera); const h = ray.intersectObjects(pickables, false)[0]; return h ? h.object.userData.fix : null; }
let down = null;
canvas.addEventListener('pointerdown', ev => {
  down = { x: ev.clientX, y: ev.clientY, shift: ev.shiftKey, box: ev.shiftKey && ev.button === 0 };
  if (down.box) { controls.enabled = false; }
});
window.addEventListener('pointermove', ev => {
  if (down && down.box) { const r = $('#viewer').getBoundingClientRect(), sr = $('#selRect');
    const x0 = Math.min(down.x, ev.clientX) - r.left, y0 = Math.min(down.y, ev.clientY) - r.top; sr.style.display = 'block';
    Object.assign(sr.style, { left: x0 + 'px', top: y0 + 'px', width: Math.abs(ev.clientX - down.x) + 'px', height: Math.abs(ev.clientY - down.y) + 'px' }); }
});
window.addEventListener('pointerup', ev => {
  if (!down) return;
  const moved = Math.hypot(ev.clientX - down.x, ev.clientY - down.y);
  if (down.box && moved > 5) {
    const r = canvas.getBoundingClientRect(), x0 = Math.min(down.x, ev.clientX), x1 = Math.max(down.x, ev.clientX), y0 = Math.min(down.y, ev.clientY), y1 = Math.max(down.y, ev.clientY), ids = [];
    for (const f of fixtures) { tmpP.copy(f.pos).project(camera); if (tmpP.z > 1) continue; const sx = r.left + (tmpP.x + 1) / 2 * r.width, sy = r.top + (1 - tmpP.y) / 2 * r.height; if (sx >= x0 && sx <= x1 && sy >= y0 && sy <= y1) ids.push(f); }
    ids.sort((a, b) => a.id - b.id); setSel(ids.map(f => f.id), 'add'); log(`Box select +${ids.length}`, 'ok');
  } else if (moved < 5 && ev.target === canvas) {
    const f = pickAt(ev.clientX, ev.clientY);
    if (f) { setSel([f.id], down.shift ? 'toggle' : 'replace'); log(`Fixture ${f.id} (${f.T.name})`, 'ok'); }
  }
  $('#selRect').style.display = 'none'; controls.enabled = true; down = null;
});
let tipT = 0;
canvas.addEventListener('pointermove', ev => {
  if (down) return; const t = performance.now(); if (t - tipT < 60) return; tipT = t;
  const f = pickAt(ev.clientX, ev.clientY), tip = $('#tip');
  if (f) { const r = $('#viewer').getBoundingClientRect(); tip.style.display = 'block'; tip.style.left = (ev.clientX - r.left + 12) + 'px'; tip.style.top = (ev.clientY - r.top + 12) + 'px'; tip.textContent = `${f.id} · ${f.T.name}`; canvas.style.cursor = 'pointer'; }
  else { tip.style.display = 'none'; canvas.style.cursor = ''; }
});

/* ====================================================================
   MIDI
==================================================================== */
$('#midiBtn').onclick = async () => {
  if (!navigator.requestMIDIAccess) { toast('Web MIDI is not available in this browser'); return; }
  try {
    const acc = await navigator.requestMIDIAccess();
    const bind = () => { let n = 0; acc.inputs.forEach(inp => { n++; inp.onmidimessage = m => {
      const [st, d1, d2] = m.data, type = st & 0xf0;
      if (type === 0xB0 && d1 >= 1 && d1 <= 10) { const e = execs[d1 - 1]; setLevel(e, d2 / 127); }
      else if (type === 0x90 && d2 > 0 && d1 >= 36 && d1 <= 45) execGo(execs[d1 - 36], 1);
      else if (type === 0xB0 && d1 === 0) gm = d2 / 127;
    }; }); return n; };
    const n = bind(); acc.onstatechange = bind;
    $('#midiBtn').classList.add('on'); toast(n ? `MIDI: ${n} input(s) connected` : 'MIDI enabled — no devices found yet');
  } catch (e) { toast('MIDI blocked here — open the page in its own tab in Chrome'); }
};

/* ====================================================================
   OVERLAY (fixture IDs) + RESIZE + LOOP
==================================================================== */
function drawOverlay() {
  const w = ov.width, h = ov.height; ovx.clearRect(0, 0, w, h);
  if (!showIds) return;
  const dpr = ov.width / ov.clientWidth; ovx.font = `${10 * dpr}px JetBrains Mono`; ovx.textAlign = 'center';
  for (const f of fixtures) { tmpP.copy(f.pos).project(camera); if (tmpP.z > 1 || Math.abs(tmpP.x) > 1 || Math.abs(tmpP.y) > 1) continue;
    const x = (tmpP.x + 1) / 2 * w, y = (1 - tmpP.y) / 2 * h - 10 * dpr;
    ovx.fillStyle = f.sel ? '#ffc21a' : '#ffffff99'; ovx.fillText(f.id, x, y); }
}
// projected height of the MA console overlay (0 in the other layouts), set by fitDesk()
let maConH = 0;
function resize() {
  const v = $('#viewer'), w = v.clientWidth, h = v.clientHeight;
  renderer.setSize(w, h, false); composer.setSize(w, h); bloom.setSize(w / 2, h / 2);
  camera.aspect = w / h;
  // MA: the console covers the bottom of the stage view, so the look-at point is moved to the middle of the free area above it
  if (maConH) camera.setViewOffset(w, h, 0, Math.round(maConH / 2), w, h); else camera.clearViewOffset();
  camera.updateProjectionMatrix();
  const d = Math.min(devicePixelRatio, 1.5); ov.width = w * d; ov.height = h * d;
}
new ResizeObserver(resize).observe($('#viewer')); resize();

let last = performance.now(), fpsAcc = 0, fpsN = 0, uiT = 0, slowT = 0;
function loop(t) {
  requestAnimationFrame(loop);
  const dt = Math.min((t - last) / 1000, .1); last = t; const now = t / 1000;
  crowdU.uBeat.value = (now - beatOrigin) * bpm / 60 * Math.PI; crowdU.uJump.value = auto.pulse === 'audio' && song.an ? .3 + autoPump : 1;
  songSync(); autoTick(now); stepFades(now); computeOutput(now); updateVisuals(now, dt); updateProps(now); animPerformers(now);
  controls.update();
  if (glowOn) composer.render(); else renderer.render(scene, camera);
  drawOverlay();
  fpsAcc += dt; fpsN++;
  if (t - uiT > 50) { uiT = t; updateExecUI(); updateEncUI(); updateAutoUI(now); if (deskMode === 'ma') updateMaUI();
    $('#selInfo').innerHTML = `Selection: <b>${sel.length}</b>${sel.length ? ` <span style="color:var(--mut)">${sel.length < 6 ? sel.join(' ') : sel[0] + '…' + sel[sel.length - 1]}</span>` : ''}`;
    const np = Object.keys(prog.vals).length; $('#progInfo').innerHTML = np || prog.fxList.length ? `Programmer: <b style="color:var(--prog)">${np} fix${prog.fxList.length ? ' · ' + prog.fxList.length + ' fx' : ''}</b>` : 'Programmer: empty';
    $('#kHigh').classList.toggle('on', highlight); $('#boBtn').classList.toggle('on', blackout); $('#kFan').classList.toggle('on', fanMode);
    $('#bpmBox').textContent = bpm + ' BPM'; $('#gmVal').textContent = Math.round(gm * 100);
    $('#gmFader .ff').style.height = gm * 100 + '%'; $('#gmFader .cap').style.bottom = gm * 100 + '%';
  }
  if (t - slowT > 400 || uiDirty.all) { slowT = t;
    if (sideTab === 'seq') renderSeq(); if (sideTab === 'sheet') renderSheet();
    if (uiDirty.all) uiDirty.all = false;
    $('#fps').textContent = Math.round(fpsN / fpsAcc) + ' fps'; fpsAcc = 0; fpsN = 0;
    const d = new Date(); $('#clock').textContent = d.toLocaleTimeString('en-GB');
  }
}

/* ====================================================================
   AUTO SHOW — style-based look generator synced to BPM / music
==================================================================== */
let autoPump = 1, autoHitUntil = 0;
const pickR = a => a[Math.floor(Math.random() * a.length)];
const COL = n => { const c = COLORS.find(x => x[0] === n); return { r: c[1], g: c[2], b: c[3] }; };
const SEC_NAMES = { groove: 'Groove', verse: 'Verse', chorus: 'Chorus', hook: 'Hook', build: 'Build-up', drop: 'Drop', intro: 'Intro' };
const STYLES = {
  edm: { name: 'EDM / Festival', he: 'בילדים, דרופים וסטרובים', fade: .12, bars: 4, pal: [['Cyan', 'Magenta'], ['Blue', 'White'], ['Red', 'White'], ['Lime', 'Blue'], ['Magenta', 'Congo'], ['Orange', 'Cyan']], pos: ['fanAud', 'skyFan', 'vOut', 'tunnel', 'audience'], fxPos: ['bally', 'circle', 'tilt', 'pan'], fxDim: ['dimChase', 'dimSaw', 'flash'], rate: [1, 2], strobe: true, blinders: true, screen: [2, 3, 7, 4], sections: ['groove', 'groove', 'build', 'drop'] },
  techno: { name: 'Techno', he: 'מונוכרום, חד ומכני', fade: .05, bars: 8, pal: [['White', 'White'], ['Red', 'Red'], ['Blue', 'White'], ['CTO', 'White']], pos: ['straight', 'tunnel', 'vOut', 'skyFan'], fxPos: ['tilt', 'pan'], fxDim: ['dimChase', 'flash', 'dimSaw'], rate: [2, 4], strobe: true, blinders: false, mono: true, screen: [5, 7, 2], sections: ['groove', 'build', 'drop', 'groove'] },
  rock: { name: 'Rock', he: 'אדום־ענבר, בלינדרים בפזמון', fade: .3, bars: 8, pal: [['Red', 'Amber'], ['Amber', 'White'], ['Blue', 'White'], ['Red', 'Blue'], ['CTO', 'Red']], pos: ['band', 'cross', 'audience', 'vOut'], fxPos: ['tilt', 'bally'], fxDim: ['dimChase'], rate: [.5, 1], strobe: true, blinders: true, screen: [1, 2, 6], sections: ['verse', 'chorus'] },
  pop: { name: 'Pop', he: 'צבעוני, תנועה רכה ומלוטשת', fade: .8, bars: 8, pal: [['Pink', 'Lt Blue'], ['Magenta', 'Cyan'], ['Lavender', 'Amber'], ['Yellow', 'Magenta'], ['Congo', 'Pink']], pos: ['fanAud', 'band', 'skyFan', 'cross'], fxPos: ['circle', 'pan'], fxDim: ['dimSine'], fxCol: ['rainbow'], rate: [.5, 1], strobe: false, blinders: true, screen: [3, 4, 6, 1], sections: ['verse', 'chorus'] },
  hiphop: { name: 'Hip-Hop', he: 'כבד, חם, שוטים חדים', fade: .15, bars: 4, pal: [['Amber', 'Magenta'], ['Congo', 'Amber'], ['Red', 'Blue'], ['Yellow', 'Congo']], pos: ['vOut', 'fanAud', 'straight', 'down'], fxPos: ['tilt'], fxDim: ['dimChase', 'dimSaw'], rate: [.5, 1], strobe: true, blinders: true, screen: [5, 2, 4], sections: ['verse', 'hook'] },
  mizrahi: { name: 'Mizrahi / Party', he: 'קשת צבעים והמון תנועה', fade: .3, bars: 4, pal: [['Magenta', 'Cyan'], ['Orange', 'Magenta'], ['Yellow', 'Congo'], ['Red', 'Lime'], ['Pink', 'Blue']], pos: ['fanAud', 'skyFan', 'band', 'audience'], fxPos: ['bally', 'circle', 'pan'], fxDim: ['dimChase', 'dimSine'], fxCol: ['rainbow', 'rgbChase'], rate: [1, 2], strobe: false, blinders: true, screen: [3, 6, 7], sections: ['groove', 'chorus'] },
  ballad: { name: 'Ballad', he: 'חם, איטי, פייד ארוך', fade: 3.5, bars: 16, pal: [['Blue', 'Lavender'], ['CTO', 'Warm'], ['Congo', 'Blue'], ['Amber', 'Warm'], ['Lt Blue', 'White']], pos: ['skyFan', 'screen', 'center'], fxPos: ['circle'], fxDim: [], rate: [.125, .25], calm: true, strobe: false, blinders: false, screen: [1, 4, 0], sections: ['verse', 'chorus'] },
  orchestral: { name: 'Orchestral', he: 'פוקוס על התזמורת, חם ואלגנטי', fade: 4, bars: 16, pal: [['Amber', 'Blue'], ['CTO', 'Congo'], ['Warm', 'Lavender'], ['Amber', 'Lt Blue']], pos: ['skyFan', 'screen'], fxPos: [], fxDim: [], gobos: [2, 7, 1], calm: true, orch: true, strobe: false, blinders: false, screen: [1, 0, 4], sections: ['verse', 'chorus'] },
  cinematic: { name: 'Cinematic', he: 'בימים לשמיים, נשימה איטית', fade: 2, bars: 8, pal: [['White', 'Blue'], ['Lt Blue', 'Congo'], ['CTO', 'Blue']], pos: ['skyFan', 'screen', 'tunnel', 'vOut'], fxPos: ['tilt', 'pan'], fxDim: ['dimSaw', 'dimSine'], rate: [.25, .5], strobe: false, blinders: true, screen: [1, 4, 6], sections: ['build', 'chorus'] },
};
const AG = { audW: range(1801, 1899), towB: range(1601, 1699), towW: range(1701, 1799), ring: range(1201, 1299), rwash: range(1301, 1399), angB: range(1401, 1499), angS: range(1501, 1599), foh: range(101, 199), t2: range(201, 299), t3: range(301, 399), t4: range(401, 499), back: range(501, 599), tow: range(601, 699), floor: range(701, 799), fwash: range(1001, 1099), pars: range(1101, 1199), blind: range(801, 899), strobe: range(901, 999), bars: range(2101, 2199), follow: range(1901, 1999), prof: range(2201, 2299) };
const auto = { on: false, style: 'edm', energy: .85, master: 1, bars: 0, pulse: 'off', strobes: true, hits: true, screen: true, take: true, secIdx: 0, lastBar: null, sec: '', changeAt: 0 };
function genLook(S, sec) {
  const vals = {}, fx = [];
  const set = (ids, o) => ids.forEach((id, k) => { const f = FX[id]; const v = typeof o === 'function' ? o(f, k, ids.length) : o; const out = vals[id] = vals[id] || {};
    for (const a in v) if (has(f, a)) out[a] = a === 'zoom' ? clamp(v[a], f.T.zr[0], f.T.zr[1]) : v[a]; });
  const secE = { groove: .75, verse: .65, chorus: 1, hook: 1, build: .8, drop: 1 }[sec] ?? .8;
  const E = clamp(auto.energy * secE, .05, 1.2), L = x => Math.round(clamp(x * E, 0, 100));
  const [n1, n2] = pickR(S.pal), c1 = COL(n1), c2 = COL(n2);
  const big = sec === 'chorus' || sec === 'hook' || sec === 'drop';
  set(fixtures.filter(f => f.type !== 'screen').map(f => f.id), { dim: 0, strobe: 0, gobo: 0, grot: 0 });
  const wPos = S.orch ? pickR(['orch', 'band', 'center']) : S.calm ? pickR(['center', 'band', 'singer']) : pickR(['center', 'band', 'cross', 'down', 'orch']);
  set(AG.t3, (f, k, n) => ({ ...PFN[wPos](f, k, n), ...(k % 2 ? c2 : c1), dim: L(S.calm ? 62 : 78), zoom: S.calm ? 34 : 24 }));
  set(AG.tow, (f, k, n) => ({ ...PFN[S.orch || Math.random() < .4 ? 'orch' : 'band'](f, k, n), ...c2, dim: L(S.calm ? 50 : 66), zoom: 28 }));
  set(AG.pars, { ...c2, dim: L(85) });
  set(AG.audW, (f, k, n) => ({ ...PFN.crowd(f, k, n), ...(big ? COL('White') : c2), dim: L(big ? 95 : S.calm ? 25 : 45), zoom: 50, strobe: sec === 'drop' && S.strobe && auto.strobes ? 50 : 0 }));
  set(AG.towW, (f, k, n) => ({ ...PFN[S.calm || S.orch ? 'band' : pickR(['band', 'audience', 'center'])](f, k, n), ...(k % 2 ? c1 : c2), dim: L(S.calm ? 40 : 60), zoom: 30 }));
  set(AG.fwash, (f, k, n) => ({ ...PFN[sec === 'verse' || S.calm ? 'down' : 'vOut'](f, k, n), ...c1, dim: L(sec === 'verse' || S.calm ? 35 : 62), zoom: 20 }));
  // footlight bars: a tight colour curtain straight up on big sections, otherwise a soft wash back onto the band
  set(AG.bars, (f, k) => ({ tilt: big ? 6 : -32, ...(big && k % 2 ? c2 : c1), dim: L(big ? 90 : 45), zoom: big ? 6 : 30 }));
  if ((sec === 'build' || sec === 'drop') && S.fxPos.length) fx.push({ type: 'tilt', rate: pickR(S.rate || [1]), size: FXT.tilt.size, spread: 360, ids: [...AG.bars] });
  // follow spots stay on the lead singer; profiles add a side wash
  set(AG.follow, (f, k, n) => ({ ...PFN.singer(f, k, n), ...COL('Warm'), dim: L(big ? 85 : 55), zoom: big ? 7 : 11, gobo: 0 }));
  set(AG.prof, (f, k) => ({ ...(k % 2 ? c1 : c2), dim: L(S.calm ? 55 : 35) }));
  const gob = pickR(S.gobos || [1, 2, 3, 4, 5, 7]);
  if (S.calm || !big) set(AG.foh, (f, k, n) => ({ ...PFN[S.orch && k % 2 ? 'orch' : 'singer'](f, k, n), ...COL('Warm'), dim: L(72), gobo: S.calm ? (S.gobos ? gob : 0) : gob, zoom: S.calm ? 11 : 13, grot: S.calm ? 0 : 8 }));
  else set(AG.foh, (f, k, n) => ({ ...PFN[pickR(['audience', 'cross', 'fanAud'])](f, k, n), ...COL('White'), dim: L(82), gobo: gob, zoom: 14, grot: pickR([-30, 20, 40]) }));
  set(AG.t4, (f, k, n) => ({ ...PFN[S.orch ? 'orch' : pickR(['cross', 'band', 'down', 'orch'])](f, k, n), ...(S.mono ? COL('White') : c1), dim: L(S.calm ? 48 : 62), gobo: pickR(S.gobos || [1, 2, 3, 7]), zoom: 16, grot: pickR([-12, 12, 0]) }));
  set(AG.rwash, (f, k, n) => ({ ...PFN[S.calm ? 'ringCone' : pickR(['center', 'ringCone', 'band'])](f, k, n), ...(k % 2 ? c1 : c2), dim: L(S.calm ? 45 : 70), zoom: 26 }));
  if (!S.calm || S.orch) set(AG.angS, (f, k, n) => ({ ...PFN[S.orch ? 'orch' : pickR(['cross', 'band', 'audience'])](f, k, n), ...(S.mono ? COL('White') : c2), dim: L(S.calm ? 45 : 70), gobo: pickR(S.gobos || [1, 3, 5, 7]), zoom: 14, grot: pickR([-20, 20, 35]) }));
  const order = [AG.t2, AG.back, AG.floor, AG.angB, AG.towB];
  let active = big ? [AG.ring, ...order] : sec === 'build' ? [AG.ring, AG.floor, AG.t2] : [AG.ring, pickR(order)];
  if (auto.energy < .45) active = active.slice(0, 1);
  if (S.calm) active = [AG.ring, AG.back];
  active.forEach((ids, gi) => {
    const pn = ids === AG.ring ? pickR(S.calm ? ['ringDown', 'ringCrown', 'ringCone'] : sec === 'drop' ? ['ringSun', 'ringTwist'] : ['ringCone', 'ringSun', 'ringTwist', 'ringCrown', 'ringDown']) : ids === AG.angB ? pickR(['wingFan', 'converge', 'ringCrown', ...S.pos]) : pickR(S.pos), col = S.mono ? COL(pickR(['White', 'White', n1])) : (gi % 2 ? c2 : c1);
    set(ids, (f, k, n) => ({ ...PFN[pn](f, k, n), ...col, dim: L(S.calm ? 50 : 95), zoom: 2, gobo: 0 }));
    const rate = pickR(S.rate || [1]) * (sec === 'drop' || sec === 'build' ? 2 : 1);
    if (S.fxPos.length && Math.random() < (S.calm ? .7 : .85)) { const t = pickR(S.fxPos); fx.push({ type: t, rate, size: FXT[t].size * (S.calm ? .5 : sec === 'drop' ? 1.2 : 1), spread: pickR([0, 180, 360, 720]), ids: [...ids] }); }
    if (S.fxDim.length && (sec === 'build' || sec === 'drop' || Math.random() < .45)) fx.push({ type: sec === 'build' ? 'dimChase' : pickR(S.fxDim), rate, size: L(100), spread: pickR([360, 720]), ids: [...ids] });
    if (S.fxCol && Math.random() < .4) fx.push({ type: pickR(S.fxCol), rate: .5, size: 100, spread: 360, ids: [...ids] });
  });
  if (sec === 'drop' && S.strobe && auto.strobes) { set(AG.strobe, { dim: 100, strobe: pickR([75, 85, 92]) }); set(AG.t3, { strobe: 35 }); }
  if (auto.screen) set([2001], { ...(S.mono ? COL('White') : c1), dim: L(S.calm ? 28 : 80), gobo: pickR(S.screen), grot: S.calm ? 5 : pickR([20, 40, 70]) });
  else set([2001], { dim: 0 });
  return { num: 1, name: `${S.name} · ${SEC_NAMES[sec] || sec}`, fade: S.fade, vals, fx, sec };
}
function autoNewLook() {
  const S = STYLES[auto.style], sec = S.sections[auto.secIdx % S.sections.length]; auto.secIdx++;
  const cue = genLook(S, sec); auto.sec = sec;
  autoExec.cues = [cue]; autoExec.cache = {}; autoExec.level = auto.master;
  gotoCue(autoExec, 0, S.fade);
  if (auto.hits && S.blinders && (sec === 'chorus' || sec === 'drop' || sec === 'hook')) autoHitUntil = nowS() + .28;
}
function autoBars() { return auto.bars || STYLES[auto.style].bars; }
function autoStart() {
  auto.on = true; auto.secIdx = 0; auto.lastBar = null;
  if (auto.take) execs.forEach(execOff);
  if (progHasContent()) toast('Note: programmer values override Auto — press CLEAR twice to release');
  beatOrigin = nowS(); autoNewLook(); auto.lastBar = 0; renderAuto();
}
function autoStop() { auto.on = false; execOff(autoExec); renderAuto(); }
function autoTick(now) {
  const beatF = (now - beatOrigin) * bpm / 60, beat = Math.floor(beatF), bar = Math.floor(beat / 4);
  // pulse
  if (auto.pulse === 'beat') autoPump = .45 + .55 * Math.exp(-(beatF - beat) * 5);
  else if (auto.pulse === 'audio' && song.an) { song.an.getByteFrequencyData(song.fd); let b = 0; for (let i = 1; i < 7; i++) b += song.fd[i]; b /= 6 * 255;
    song.peak = Math.max(b, song.peak * .996, .05); const n = b / song.peak; autoPump = .2 + .8 * n * n; }
  else autoPump = 1;
  if (!auto.on) return;
  autoExec.level = auto.master;
  if (auto.lastBar === null) auto.lastBar = bar;
  if (bar !== auto.lastBar) { auto.lastBar = bar; if (((bar % autoBars()) + autoBars()) % autoBars() === 0) autoNewLook(); }
}
/* music: load, detect BPM, play */
const song = { el: null, ctx: null, an: null, fd: null, bpm: null, off: 0, peak: .1 };
function detectBpm(ab) {
  const ch = ab.getChannelData(0), sr = ab.sampleRate, hop = 512;
  const start = Math.min(Math.floor(sr * 20), Math.max(0, ch.length - sr * 60)), end = Math.min(ch.length, start + sr * 60);
  let lp = 0, acc = 0, n = 0; const env = [];
  for (let i = start; i < end; i++) { lp += (ch[i] - lp) * .06; acc += lp * lp; if (++n === hop) { env.push(Math.sqrt(acc / hop)); acc = 0; n = 0; } }
  const on = env.map((v, i) => i ? Math.max(0, v - env[i - 1]) : 0), fps = sr / hop;
  let best = -1, bb = 120;
  for (let b = 70; b <= 180; b += .5) { const lag = fps * 60 / b, li = Math.floor(lag), fr = lag - li; let sum = 0;
    for (let i = li + 1; i < on.length; i++) sum += on[i] * (on[i - li] * (1 - fr) + on[i - li - 1] * fr);
    sum /= (on.length - lag); sum *= 1 - Math.abs(Math.log2(b / 120)) * .35; if (sum > best) { best = sum; bb = b; } }
  const per = fps * 60 / bb; let bp = -1, bo = 0;
  for (let o = 0; o < per; o++) { let sm = 0; for (let t = o; t < on.length; t += per) sm += on[Math.round(t)] || 0; if (sm > bp) { bp = sm; bo = o; } }
  return { bpm: Math.round(bb), off: (start / sr + bo / fps) % (60 / bb) };
}
async function loadSong(file) {
  $('#songStat').textContent = 'Analyzing tempo…';
  try {
    if (!song.el) { song.el = new Audio(); song.el.crossOrigin = 'anonymous'; song.el.onended = () => { $('#songPlay').textContent = '▶ Play'; }; }
    song.el.src = URL.createObjectURL(file);
    const buf = await file.arrayBuffer();
    const oc = new OfflineAudioContext(1, 44100, 44100);
    const ab = await oc.decodeAudioData(buf);
    const r = detectBpm(ab); song.bpm = r.bpm; song.off = r.off;
    $('#songStat').innerHTML = `<b style="color:var(--acc)">${file.name}</b> · detected <b style="color:var(--acc)">${r.bpm} BPM</b> · ${Math.round(ab.duration / 60)}:${String(Math.round(ab.duration % 60)).padStart(2, '0')}`;
    $('#songPlay').disabled = false; $('#aPulse').value = 'audio'; auto.pulse = 'audio';
  } catch (e) { $('#songStat').textContent = 'Could not read this audio file.'; }
}
function toggleSong() {
  if (!song.el) return;
  if (!song.ctx) { song.ctx = new AudioContext(); const src = song.ctx.createMediaElementSource(song.el); song.an = song.ctx.createAnalyser(); song.an.fftSize = 1024; song.an.smoothingTimeConstant = .5; src.connect(song.an); song.an.connect(song.ctx.destination); song.fd = new Uint8Array(song.an.frequencyBinCount); }
  song.ctx.resume();
  if (song.el.paused) { song.el.play(); $('#songPlay').textContent = '❚❚ Pause'; if (!auto.on) autoStart(); }
  else { song.el.pause(); $('#songPlay').textContent = '▶ Play'; }
}
function songSync() { if (song.el && !song.el.paused && song.bpm) { bpm = song.bpm; beatOrigin = nowS() - (song.el.currentTime - song.off); } }
/* auto UI */
function renderAuto() {
  const g = $('#styleGrid'); g.innerHTML = '';
  for (const k in STYLES) { const S = STYLES[k], c = S.pal[0].map(n => { const x = COL(n); return `rgb(${x.r * 2.55},${x.g * 2.55},${x.b * 2.55})`; });
    const d = el('div', 'style' + (auto.style === k ? ' on' : ''), `<div class="sb" style="background:linear-gradient(90deg,${c[0]},${c[1]})"></div><b>${S.name}</b><span dir="rtl">${S.he}</span>`);
    d.onclick = () => { auto.style = k; auto.secIdx = 0; if (auto.on) autoNewLook(); renderAuto(); }; g.appendChild(d); }
  const b = $('#autoGo'); b.classList.toggle('on', auto.on); b.textContent = auto.on ? '■ STOP AUTO' : '▶ START AUTO';
}
function updateAutoUI(now) {
  const beatF = (now - beatOrigin) * bpm / 60, beat = ((Math.floor(beatF) % 4) + 4) % 4, bar = Math.floor(beatF / 4), nb = autoBars();
  $$('#beatDots i').forEach((d, i) => d.classList.toggle('on', i === beat));
  $('#autoBpm').textContent = bpm + ' BPM';
  if (sideTab === 'auto') {
    const left = nb - (((bar % nb) + nb) % nb);
    $('#autoSec').textContent = auto.on ? `${SEC_NAMES[auto.sec] || ''} · next look in ${left} bar${left > 1 ? 's' : ''}` : '';
    $('#autoStatus').innerHTML = auto.on ? `<b>● AUTO RUNNING</b> — ${STYLES[auto.style].name}, section <b>${SEC_NAMES[auto.sec]}</b>, fade ${STYLES[auto.style].fade}s, change every ${nb} bars.<br>Programmer still overrides Auto, so you can grab fixtures live. Executor faders (HTP) add on top.`
      : 'Pick a style and press START. Looks are generated on the bar, following the style\'s song sections (verse / chorus / build / drop). Use TAP or load a song to lock to the music.';
  }
}
$('#autoGo').onclick = () => auto.on ? autoStop() : autoStart();
$('#aEnergy').oninput = ev => { auto.energy = ev.target.value / 100; $('#aEnergyV').textContent = ev.target.value; };
$('#aEnergy').onchange = () => { if (auto.on) autoNewLook(); };
$('#aMaster').oninput = ev => { auto.master = ev.target.value / 100; $('#aMasterV').textContent = ev.target.value; };
$('#aBars').onchange = ev => auto.bars = +ev.target.value;
$('#aPulse').onchange = ev => auto.pulse = ev.target.value;
$('#aStrobe').onchange = ev => auto.strobes = ev.target.checked;
$('#aHits').onchange = ev => auto.hits = ev.target.checked;
$('#aScreen').onchange = ev => auto.screen = ev.target.checked;
$('#aTake').onchange = ev => auto.take = ev.target.checked;
$('#songFile').onchange = ev => { const f = ev.target.files[0]; if (f) loadSong(f); };
$('#songPlay').onclick = toggleSong;
$('#aNext').onclick = () => { if (!auto.on) autoStart(); else autoNewLook(); };
$('#aSave').onclick = () => {
  if (!auto.on || !autoExec.cues[0]) { toast('Start Auto first'); return; }
  const e = execs[selExec], num = e.cues.length ? Math.floor(e.cues[e.cues.length - 1].num) + 1 : 1;
  const c = deep(autoExec.cues[0]); c.num = num; c.name = `${STYLES[auto.style].name.split(' ')[0]} ${SEC_NAMES[c.sec] || ''}`; delete c.sec;
  e.cues.push(c); if (!e.name) e.name = `Seq ${selExec + 1}`; invalidate(e); persist(); uiDirty.all = true;
  toast(`Look saved as Cue ${num} in Exec ${selExec + 1}`); log(`Auto look → Exec ${selExec + 1} Cue ${num}`, 'ok');
};
$('#aList').onclick = () => {
  const S = STYLES[auto.style]; let ei = execs.findIndex((e, i) => i > 0 && !e.cues.length); if (ei < 0) { toast('No empty executor — clear one first'); return; }
  const cues = []; for (let i = 0; i < 8; i++) { const sec = S.sections[i % S.sections.length]; const c = genLook(S, sec); c.num = i + 1; c.name = `${SEC_NAMES[sec]} ${i + 1}`; delete c.sec; cues.push(c); }
  const e = execs[ei]; e.name = S.name; e.cues = cues; e.cache = {}; selExec = ei; persist(); uiDirty.all = true;
  toast(`8-cue ${S.name} list built in Exec ${ei + 1}`); log(`Built ${S.name} cue list → Exec ${ei + 1}`, 'ok');
};
function animPerformers(now) {
  const bf = (now - beatOrigin) * bpm / 60 * Math.PI * 2;
  for (const p of performers) { const b = Math.sin(bf + p.ph); p.g.position.y = p.y + Math.abs(b) * p.amp; p.g.rotation.y = p.ry + Math.sin(bf * .25 + p.ph) * p.sway; p.head.rotation.x = b * .12; }
}

/* ====================================================================
   USER GUIDE (Hebrew) + GUIDED TOUR
==================================================================== */
const K = k => `<kbd>${k}</kbd>`, CD = c => `<code>${c}</code>`;
const RIG_TABLE = [['101–120', 'Spot', 'טראס קדמי (FOH)'], ['201–230', 'Beam', 'טראס 2'], ['301–330', 'Wash', 'טראס 3'], ['401–420', 'Spot', 'טראס 4'], ['501–530', 'Beam', 'טראס אחורי'],
  ['601–624', 'Wash', 'מגדלי צד (טורים)'], ['701–740', 'Beam', 'רצפה, ירכתי הבמה'], ['801–816', 'Blinder', 'טראס קדמי, לקהל'], ['901–920', 'Strobe', 'טראס 3'], ['1001–1016', 'Wash', 'רצפה, קדמת הבמה'],
  ['1101–1120', 'LED Par', 'רצפה, מתחת למסך'], ['1201–1224', 'Beam', 'הטבעת החיצונית (עיגול)'], ['1301–1312', 'Wash', 'הטבעת הפנימית'], ['1401–1424', 'Beam', 'תרסות זוויתיות'], ['1501–1512', 'Spot', 'תרסות זוויתיות (אמצעיות)'],
  ['1601–1610', 'Beam', 'ראש עמודי התאורה על הבמה'], ['1701–1710', 'Wash', 'אמצע עמודי התאורה'], ['1801–1812', 'Wash', 'תאורת קהל, טראס קדמי'], ['1813–1818', 'Wash', 'מגדלי דיליי בקהל'], ['1901–1904', 'Follow Spot', 'טראס קדמי, בין הספוטים; עמדת RoboSpot ב־FOH'],
  ['2101–2112', 'LED Bar', 'רצפה, קדמת הבמה (Tilt בלבד)'], ['2201–2212', 'Profile', 'סולמות הצד, קבועים'], ['2001', 'LED Screen', 'מסך LED (ומסכי הצד)']];
const GUIDE = [
 { t: 'התחלה מהירה', h: () => `
  <p>LUMA DESK היא קונסולת תאורה בסגנון grandMA עם במה וירטואלית בתלת־ממד בבריכת הסולטן: 405 גופים, להקה, תזמורת וקהל. בעמוד הזה, תוך 5 דקות, תבנה ותקליט לוק ראשון ותריץ אותו.</p>
  <h3>הרצת הדמו</h3>
  <ol class="steps"><li>מופע דמו כבר טעון באקזקיוטר 1 (Main Show). לחץ ${K('רווח')} או על כפתור ה־<b>GO +</b> הירוק הגדול למטה מימין, ו־Cue אחרי Cue ירוץ.</li>
  <li>החלף זוויות מצלמה מהשורה העליונה: <b>FOH</b>, <b>Wide</b>, <b>Audience</b>, <b>Drums</b>, <b>Old City</b>…</li></ol>
  <h3>לוק ראשון משלך</h3>
  <ol class="steps">
  <li>לחץ <b>CLEAR</b> פעמיים ברצף כדי להתחיל מפרוגרמר נקי.</li>
  <li>בחר גופים: ב־<b>Pools</b> (ב־Classic בפאנל הימני, ב־Desk ב־SCREEN משמאל, ב־Console (MA) במסך 2) לחץ על הקבוצה <b>24 Ring Beams</b> (הבימים בעיגול). הם יסומנו בצהוב בבמה.</li>
  <li>תן להם אור: בשורת הפקודה למטה הקלד ${CD('At Full')} ו־${K('Enter')}.</li>
  <li>צבע: בטאב התחתון <b>Color</b> לחץ על ריבוע הציאן, או ב־Presets בחר את הטאב <b>4 Color</b> ולחץ על <b>Cyan</b>.</li>
  <li>מיקום: ב־Presets בחר <b>2 Position</b> ולחץ על <b>Ring Cone</b>. הבימים מתכנסים לחרוט.</li>
  <li>תנועה: בטאב התחתון <b>Phaser</b> לחץ <b>Circle</b>. הטבעת מסתובבת.</li>
  <li>הקלטה: לחץ <b>STORE</b> (מהבהב באדום), ואז לחץ על <b>השם</b> של אקזקיוטר 10 (Wings). הלוק נשמר בסוף הרשימה שלו כ־Cue 3. אפשר גם להקליד ${CD('Store Cue 3 Exec 10')}.</li>
  <li>לחץ <b>CLEAR</b> פעמיים. לחץ על שם אקזקיוטר 10, הרם את הפיידר שלו והקלד ${CD('Goto Cue 3')}. הלוק שלך חוזר.</li></ol>
  <div class="tipbox"><b>טיפ:</b> לחץ על <b>סיור מודרך</b> בתפריט הימני. הוא מראה על המסך איפה נמצא כל דבר.</div>` },
 { t: 'המסך', h: () => `
  <table><tr><th>אזור</th><th>מה יש בו</th></tr>
  <tr><td>שורה עליונה</td><td>זוויות מצלמה, <b>House</b> (אורות קהל), <b>Haze</b> (עשן), <b>Glow</b>, <b>Real light</b> (אור אמיתי וצללים), <b>Fixture IDs</b> (מספרי גופים על הבמה), MIDI, Show File והמדריך.</td></tr>
  <tr><td>הבמה (מרכז)</td><td>תצוגת התלת־ממד. למעלה משמאל: כמה גופים נבחרים ומה יש בפרוגרמר. למטה משמאל: ה־Cue הנוכחי והבא באקזקיוטר הנבחר.</td></tr>
  <tr><td>פאנל המסכים</td><td><b>Pools</b> (קבוצות ו־Presets), <b>Auto Show</b>, <b>Sequence</b> (רשימת ה־Cues), <b>Fixture Sheet</b> (טבלת ערכים של כל הגופים). ב־Classic זה הפאנל הימני וב־Desk זה SCREEN משמאל, עם ארבעה טאבים. ב־Console (MA) ה־Pools תמיד במסך 2, והשלושה האחרים הם טאבים במסך 1.</td></tr>
  <tr><td>שורת אנקודרים</td><td>טאבים לפי תכונה: Dimmer, Position, Gobo, Color, Beam, Phaser. אנקודרים וכלים ייעודיים לכל טאב. נקודה אדומה ליד טאב = יש ערכים בפרוגרמר.</td></tr>
  <tr><td>פריסה (Layout)</td><td>ברירת המחדל היא <b>Console (MA)</b>: קונסולה פיזית גדולה בסגנון grandMA שעומדת לפני הבמה, בעמדת התאורה בתוך הקהל. זווית FOH מראה את הבמה מגובה העיניים של המפעיל. הידית בקצה העליון של המסגרת של המסכים משנה את גודל הקונסולה בגרירה, ודאבל־קליק מחזיר לגודל האוטומטי. למעלה 2 מסכים גדולים: מסך 1 עם Fixture Sheet, Sequence ו־Auto Show ושורת הפקודה, ומסך 2 עם ה־Pools (קבוצות ו־Presets) וכלי הפרוגרמר. במשטח משמאל: מסך LCD רחב מעל 4 פיידרים מיוחדים בכיפות זהב (HOUSE, HAZE, ENERGY, AUTO MSTR) ו־10 אקזקיוטרים עם מקשים. מימין: מקשי תכונות, 5 אנקודרים, 2 מסכי מגע קטנים (צבע ומיקום), מקלדת, GO, פיידר GM וגלגל LEVEL לעוצמת הבחירה. <b>Desk</b>: הבמה לכל הרוחב, ומתחתיה קונסולה אחת קומפקטית במרכז, כמו שולחן אמיתי. משמאל SCREEN (Pools, Auto, Sequence), באמצע PROGRAMMER ו־PLAYBACK, מימין COMMAND עם מקלדת מספרים ו־MASTER. ב־Desk הבורר שליד Layout מגדיל או מקטין את הקונסולה (Auto מתאים אותה לרוחב המסך). <b>Classic</b> מחזיר לפריסה הקודמת.</td></tr>
  <tr><td>שולחן (למטה)</td><td>שורת פקודה ומקשים (STORE, CLEAR…), 10 אקזקיוטרים עם פיידרים, ובצד ימין של השולחן: GO הגדול, GO−, PAUSE, B.O., TAP, OFF ופיידר GM. זה נכון בכל שלוש הפריסות.</td></tr></table>
  <h3>שליטה במצלמה</h3><ul><li>גרירה עם הכפתור השמאלי: סיבוב סביב הבמה.</li><li>גרירה עם הכפתור הימני: הזזה.</li><li>גלגלת: זום.</li><li>כפתורי זווית למעלה מחזירים לנקודות קבועות.</li></ul>` },
 { t: 'בחירת גופים', h: () => `
  <h3>בבמה</h3><ul><li>לחיצה על גוף: בוחר רק אותו. ${K('Shift')}+לחיצה: מוסיף או מוריד מהבחירה.</li><li>${K('Shift')}+גרירה: בחירה מלבנית, מוסיפה את כל הגופים שבתוך המלבן.</li><li>מעבר עם העכבר מעל גוף מציג את המספר והסוג שלו.</li><li>הכפתור <b>Fixture IDs</b> מציג מספר מעל כל גוף.</li></ul>
  <h3>Groups</h3><p>לחיצה על קבוצה ב־Pools בוחרת אותה. ${K('Shift')}+לחיצה מוסיפה לבחירה. דאבל־קליק משנה שם. סדר הבחירה חשוב לאפקטים ולפריסה (FAN, Phase).</p>
  <h3>בשורת הפקודה</h3><ul><li>${CD('Fixture 201 Thru 230')} או בקיצור ${CD('201 Thru 230')}</li><li>${CD('Group 24 + Group 31')} מוסיף. ${CD('Group 13 - Fixture 701 Thru 710')} מוריד.</li><li>${CD('All')} בוחר הכול.</li></ul>
  <h3>מקשי בחירה</h3><ul><li><b>ALL</b>: הכול. <b>ODD</b> / <b>EVEN</b>: משאיר כל גוף שני מהבחירה. <b>REVERSE</b>: הופך את סדר הבחירה (משנה כיוון של צ'ייסים ו־FAN).</li></ul>` },
 { t: 'פרוגרמר וערכים', h: () => `
  <p>הפרוגרמר הוא "שולחן העבודה": כל ערך שאתה משנה נכנס אליו ומסומן <b style="color:var(--prog)">באדום</b>. הפרוגרמר תמיד גובר על כל מה שרץ באקזקיוטרים ובאוטו, עד שמנקים אותו.</p>
  <h3>אנקודרים</h3><ul><li>גרירה למעלה ולמטה על הכפתור העגול. ${K('Shift')} = תנועה עדינה.</li><li>גלגלת העכבר מעל הכפתור.</li><li>דאבל־קליק על המספר מתחתיו: הקלדת ערך מדויק.</li></ul>
  <h3>הטאבים</h3><table>
  <tr><td>Dimmer</td><td>עוצמה. כפתורי Full / 75 / 50 / 25 / 10 / Zero.</td></tr>
  <tr><td>Position</td><td>Pan / Tilt. <b>Focus pad</b>: מפת במה, לחיצה וגרירה מכוונות את כל הבחירה לנקודה. הסליידר Aim height קובע את גובה הנקודה. Home מחזיר לישר.</td></tr>
  <tr><td>Gobo</td><td>8 גובואים וסיבוב. במסך ה־LED (גוף 2001) הטאב הזה בוחר את תוכן המסך: Solid, Gradient, Bars, Plasma, Pulse, Grid, Waves, Sparkle.</td></tr>
  <tr><td>Color</td><td>בוחר צבע (לחיצה וגרירה), 16 ריבועי צבע מוכנים, ואנקודרים לאדום, ירוק וכחול.</td></tr>
  <tr><td>Beam</td><td>Zoom (Narrow, Medium, Wide) ו־Shutter לסטרוב.</td></tr>
  <tr><td>Phaser</td><td>אפקטים, ואנקודרים ל־Rate, Size ו־Phase. ראה בפרק הבא.</td></tr></table>
  <h3>כלים</h3><ul><li><b>FAN</b>: כשהוא דולק, סיבוב אנקודר פורש את הערך סימטרית על הבחירה, ממינוס בקצה אחד לפלוס בקצה השני. מעולה למניפות.</li><li><b>HIGHLT</b>: הבחירה בלבן מלא, לפוקוס. לחיצה שנייה מכבה.</li><li><b>Knockout</b> בכל טאב: מוציא מהפרוגרמר רק את התכונה הזו לגופים הנבחרים.</li><li><b>CLEAR</b>: לחיצה ראשונה מנקה בחירה, שנייה מנקה את הפרוגרמר, דאבל־קליק מהיר מנקה הכול.</li></ul>` },
 { t: 'Presets ו־Phasers', h: () => `
  <h3>Presets</h3><p>ב־Pools בחר טאב (1 Dimmer, 2 Position, 3 Gobo, 4 Color, 5 Beam) ולחץ על Preset. הוא מוחל על הבחירה ונכנס לפרוגרמר.</p>
  <p>ה־Position Presets מחושבים לכל גוף לפי המיקום שלו בריג, ולכן אותו Preset עובד על כל קבוצה:</p>
  <table><tr><td>Center / Singer / Drums / Band / Orchestra</td><td>פוקוס על הבמה ועל הנגנים.</td></tr><tr><td>Audience / Fan Audience / Crowd</td><td>לתוך הקהל, מאירים את האנשים.</td></tr>
  <tr><td>Sky Fan / V Out / Tunnel / Cross</td><td>מניפות לשמיים, V החוצה, מנהרה, הצלבה.</td></tr><tr><td>Ring Down / Cone / Sunburst / Twist / Crown</td><td>עיצובים לעיגול: עמודים, חרוט, קרני שמש, טורנדו, כתר. עובדים גם על קבוצות אחרות.</td></tr>
  <tr><td>Converge / Wing Fan</td><td>התכנסות לנקודה מעל הקהל, ומניפה רחבה.</td></tr></table>
  <p>Preset משלך: בנה ערכים בפרוגרמר, לחץ <b>STORE</b> ואז על משבצת ריקה ב־Presets, או הקלד ${CD('Store Preset 4.20')}. דאבל־קליק על Preset משנה שם.</p>
  <h3>Phasers (אפקטים)</h3><ol><li>בחר גופים. הסדר קובע את כיוון האפקט.</li><li>בטאב <b>Phaser</b> לחץ על אפקט: Circle, Pan Sweep, Tilt Bounce, Ballyhoo, Dim Wave, Dim Chase, Swipe, Random Flash, Rainbow, Color Chase.</li><li>כוונן באנקודרים: <b>Rate</b> (מהירות יחסית ל־BPM), <b>Size</b> (גודל), <b>Phase</b> (פריסה בין הגופים: 0° כולם יחד, 360° גל אחד, 720° שני גלים).</li></ol>
  <div class="tipbox"><b>TAP</b> בשולחן: הקש בקצב השיר 4 פעמים, וכל האפקטים מסתנכרנים ל־BPM.</div>` },
 { t: 'הקלטת Cues', h: () => `
  <ol class="steps"><li>בנה לוק בפרוגרמר: בחירה, ערכים, Presets ו־Phasers.</li><li>לחץ <b>STORE</b>. הוא מהבהב באדום, והמשבצות שאפשר להקליט אליהן מסומנות.</li>
  <li>לחץ על <b>שם האקזקיוטר</b> או על ה־<b>GO+</b> שלו. ה־Cue נוסף לסוף הרשימה. מקש ${K('Esc')} מבטל את ה־STORE.</li><li>לחץ <b>CLEAR</b> פעמיים ובנה את ה־Cue הבא.</li></ol>
  <h3>בשורת הפקודה</h3><table><tr><td>${CD('Store Cue 5')}</td><td>שומר Cue מספר 5 באקזקיוטר הנבחר. אם כבר קיים, הוא מוחלף.</td></tr><tr><td>${CD('Store Cue 5 Fade 3')}</td><td>עם פייד של 3 שניות.</td></tr><tr><td>${CD('Store Cue 2 Exec 4')}</td><td>לאקזקיוטר 4.</td></tr><tr><td>${CD('Label Cue 5 Chorus')}</td><td>שם ל־Cue.</td></tr><tr><td>${CD('Delete Cue 4')}</td><td>מחיקה.</td></tr></table>
  <h3>עריכה בטאב Sequence</h3><ul><li>לחיצה על Cue: קפיצה אליו (Goto).</li><li>דאבל־קליק על השם או על הפייד: עריכה.</li><li><b>STORE</b> ואז לחיצה על Cue קיים: <b>ממזג</b> את הפרוגרמר לתוכו (Update).</li></ul>
  <h3>Tracking: חשוב להבין</h3><p>כל Cue שומר רק את מה שהיה בפרוגרמר. ערכים שלא שינית ממשיכים מה־Cue הקודם. אם ב־Cue 3 כיבית רק את הבימים, כל השאר נשאר דולק כמו ב־Cue 2. כדי לכבות משהו ב־Cue, צריך להקליט אותו עם Dimmer 0.</p>
  <div class="tipbox"><b>קיצור:</b> ב־Auto Show, הכפתור <b>Save look → cue</b> מקליט את הלוק האוטומטי הנוכחי כ־Cue, ו־<b>Build cue list</b> בונה רשימה של 8 Cues בסגנון.</div>` },
 { t: 'פלייבק והפעלה', h: () => `
  <table><tr><td>פיידר</td><td>מעל 0 מדליק את האקזקיוטר, ב־0 מכבה. דאבל־קליק על הפיידר: 0 או 100.</td></tr><tr><td>GO+ / GO−</td><td>ה־Cue הבא או הקודם. בסוף הרשימה חוזר להתחלה.</td></tr>
  <tr><td>FLASH</td><td>מומנטרי: דולק במלואו כל עוד מחזיקים.</td></tr><tr><td>OFF</td><td>מכבה את האקזקיוטר.</td></tr><tr><td>לחיצה על שם</td><td>בוחרת את האקזקיוטר ל־GO הגדול, לרווח ול־Sequence.</td></tr>
  <tr><td>GO הגדול / ${K('רווח')}</td><td>GO+ על האקזקיוטר הנבחר.</td></tr><tr><td>PAUSE</td><td>עוצר פייד באמצע. GO ממשיך אותו.</td></tr><tr><td>B.O.</td><td>בלאקאאוט מלא.</td></tr><tr><td>GM</td><td>Grand Master: עוצמה כללית לכל המערכת.</td></tr></table>
  <h3>איך אקזקיוטרים מתערבבים</h3><ul><li><b>Dimmer לפי HTP</b>: הגבוה מנצח. העוצמה של כל אקזקיוטר מוכפלת בפיידר שלו.</li><li><b>שאר התכונות לפי LTP</b>: מה שהופעל אחרון מנצח.</li><li>הפרוגרמר מעל הכול.</li></ul>
  <h3>אקזקיוטרים בדמו</h3><p>1 Main Show (10 Cues), 2 Blinders, 3 Strobes, 4 Floor Chase, 5 Swipe T2, 6 Red Alert, 7 Key Light (פוקוס לזמר), 8 Screen Sparkle, 9 Ring FX (5 לוקים לעיגול), 10 Wings. נסה FLASH על 2 ו־3 תוך כדי שה־Main Show רץ.</p>` },
 { t: 'Auto Show', h: () => `
  <ol class="steps"><li>פתח את הטאב <b>Auto Show</b> בפאנל הימני.</li><li>בחר סגנון: EDM, Techno, Rock, Pop, Hip-Hop, Mizrahi/Party, Ballad, Orchestral, Cinematic.</li><li>לחץ <b>▶ START AUTO</b>. לוקים חדשים נוצרים על הבר לפי מבנה של שיר: Verse, Chorus, Build ו־Drop.</li></ol>
  <table><tr><td>Energy</td><td>עוצמה וכמות הגופים שעובדים.</td></tr><tr><td>Auto master</td><td>פיידר ייעודי לאוטו.</td></tr><tr><td>Change every</td><td>כל כמה ברים מתחלף לוק.</td></tr><tr><td>Pulse</td><td>הבימים פועמים לביט (Beat) או לפי המוזיקה (Audio).</td></tr><tr><td>תיבות סימון</td><td>סטרובים בדרופ, בלינדרים בפזמון, המסך, השתלטות על אקזקיוטרים.</td></tr><tr><td>Next look now</td><td>לוק חדש מיד.</td></tr></table>
  <h3>עם מוזיקה</h3><p>טען קובץ mp3 או wav בתיבה <b>Music</b>. ה־BPM מזוהה אוטומטית. לחץ <b>▶ Play</b> והכול ננעל על השיר, כולל הקהל שקופץ. בלי שיר, הקש <b>TAP</b> בקצב.</p>
  <div class="tipbox">אפשר לתפוס גופים בזמן שהאוטו רץ: כל מה שבפרוגרמר גובר עליו. אחר כך <b>CLEAR</b> פעמיים מחזיר את השליטה לאוטו.</div>` },
 { t: 'שורת פקודה', h: () => `
  <p>מקלידים בכל מקום, והטקסט נכנס אוטומטית לשורת הפקודה. ${K('Enter')} מבצע, ${K('↑')} / ${K('↓')} מחזירים פקודות קודמות, ${K('Esc')} מבטל. אותיות גדולות או קטנות לא משנות.</p>
  <table><tr><th>פקודה</th><th>מה היא עושה</th></tr>
  <tr><td>${CD('Fixture 101 Thru 120')}</td><td>בחירת טווח. אפשר גם בלי המילה Fixture.</td></tr><tr><td>${CD('Group 3 + Group 9')}</td><td>חיבור קבוצות.</td></tr><tr><td>${CD('Group 13 - 701 Thru 720')}</td><td>הורדה מהבחירה.</td></tr>
  <tr><td>${CD('At 75')} · ${CD('@ 75')} · ${CD('Full')} · ${CD('Zero')}</td><td>Dimmer לבחירה.</td></tr><tr><td>${CD('Group 2 At Full')}</td><td>בחירה ועוצמה בפקודה אחת.</td></tr>
  <tr><td>${CD('Preset 4.10')}</td><td>Preset מספר 10 מסוג Color.</td></tr><tr><td>${CD('Store Cue 5 Fade 2')}</td><td>הקלטה.</td></tr><tr><td>${CD('Store Group 40')} · ${CD('Store Preset 2.30')}</td><td>שמירת קבוצה או Preset.</td></tr>
  <tr><td>${CD('Label Cue 5 Drop')} · ${CD('Label Group 40 Front')} · ${CD('Label Exec 4 Solo')}</td><td>שמות.</td></tr><tr><td>${CD('Exec 3')}</td><td>בחירת אקזקיוטר.</td></tr>
  <tr><td>${CD('Go')} · ${CD('Go-')} · ${CD('Go Exec 2')}</td><td>הפעלה.</td></tr><tr><td>${CD('Goto Cue 4')}</td><td>קפיצה ל־Cue.</td></tr><tr><td>${CD('Off')} · ${CD('Off Exec 2')}</td><td>כיבוי.</td></tr>
  <tr><td>${CD('Fade 3')}</td><td>זמן פייד ל־Cue הנוכחי.</td></tr><tr><td>${CD('Delete Cue 4')}</td><td>מחיקה.</td></tr><tr><td>${CD('Clear')} · ${CD('ClearAll')}</td><td>ניקוי.</td></tr><tr><td>${CD('Highlight')} · ${CD('Blackout')}</td><td>הפעלה וכיבוי.</td></tr></table>` },
 { t: 'קיצורים', h: () => `
  <table><tr><td>${K('רווח')}</td><td>GO+ על האקזקיוטר הנבחר.</td></tr><tr><td>הקלדת אות או מספר</td><td>פותחת את שורת הפקודה.</td></tr><tr><td>${K('F')}</td><td>מסך מלא.</td></tr><tr><td>${K('Esc')}</td><td>ביטול STORE, יציאה משורת הפקודה וסגירת חלונות.</td></tr>
  <tr><td>${K('Shift')}+לחיצה בבמה</td><td>הוספה או הורדה מהבחירה.</td></tr><tr><td>${K('Shift')}+גרירה בבמה</td><td>בחירה מלבנית.</td></tr><tr><td>${K('Shift')}+גרירת אנקודר</td><td>כוונון עדין.</td></tr>
  <tr><td>דאבל־קליק</td><td>על ערך: הקלדה. על Group, Preset, Cue או אקזקיוטר: שינוי שם. על פיידר: 0 או 100.</td></tr></table>
  <h3>MIDI</h3><p>לחץ <b>MIDI</b> ואשר. CC 1–10 שולטים בפיידרים 1–10, CC 0 ב־GM, ו־Notes 36–45 הם GO לאקזקיוטרים 1–10. ייתכן שהדפדפן יחסום MIDI בתוך העמוד הזה.</p>` },
 { t: 'הריג והקבוצות', h: () => `
  <p>405 גופים בבריכת הסולטן. מספרי הגופים לפי מיקום:</p>
  <table><tr><th>מספרים</th><th>סוג</th><th>מיקום</th></tr>${RIG_TABLE.map(r => `<tr><td><code>${r[0]}</code></td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</table>
  <h3>קבוצות מוכנות</h3><table>${Object.entries(defaultGroups()).map(([n, g]) => `<tr><td><code>Group ${n}</code></td><td>${g.name}</td><td style="color:var(--mut)">${g.ids.length} גופים</td></tr>`).join('')}</table>` },
 { t: 'שמירה וביצועים', h: () => `
  <h3>שמירת המופע</h3><ul><li>המופע נשמר אוטומטית בדפדפן הזה: Cues, קבוצות ו־Presets.</li><li><b>Show File</b> ← <b>Download show file</b> מוריד את כל המופע כקובץ ‎.json. במחשב אחר: Show File ← טעינה מקובץ, או הדבקה ב־<b>Load pasted show</b>.</li><li><b>Reload demo show</b> מחזיר את הדמו. <b>New empty show</b> פותח מופע ריק עם הקבוצות.</li></ul>
  <div class="warnbox">ניקוי היסטוריית הדפדפן מוחק את המופע השמור. כדאי לגבות ב־Download show file.</div>
  <h3>הקלטת וידאו של המופע</h3><p>לחץ <b>● REC</b> בשורה העליונה. ההקלטה מתחילה (הכפתור מהבהב באדום), ולחיצה נוספת עוצרת ומורידה קובץ וידאו ‎.webm של תצוגת הבמה, כולל השיר אם טענת אחד ב־Auto Show. כדאי לבחור קודם זווית מצלמה ולהעלות את המסך למצב מלא (⛶ או ${K('F')}).</p><h3>התקנה כאפליקציה</h3><p>ב־Chrome או Edge במחשב: לחץ <b>⬇ התקן אפליקציה</b> למעלה (או על סמל ההתקנה בשורת הכתובת). ב־iPad/iPhone: שיתוף ← <b>הוסף למסך הבית</b>. אחרי ההתקנה האפליקציה נפתחת בחלון משלה ועובדת גם בלי אינטרנט.</p>
  <h3>אם יש האטה</h3><ol><li>כבה <b>Real light</b> (אור אמיתי וצללים).</li><li>כבה <b>Glow</b>.</li><li>הקטן את חלון הדפדפן.</li><li>השתמש ב־Chrome או ב־Edge במחשב עם כרטיס מסך.</li></ol>
  <h3>אם לא רואים</h3><ul><li>האלומות חזקות מדי ולא רואים את הנגנים: הורד <b>Haze</b>.</li><li>הקהל חשוך: הרם <b>House</b> או הפעל את הקבוצה 33 Audience Washes.</li><li>שום דבר לא מגיב: בדוק ש־<b>B.O.</b> כבוי וש־<b>GM</b> למעלה.</li><li>משהו "תקוע" ולא משתנה: הפרוגרמר גובר. לחץ <b>CLEAR</b> פעמיים.</li></ul>` },
];
let gIdx = 0;
function renderGuide() {
  $('#gNav').innerHTML = `<div class="gt"><i></i>מדריך LUMA DESK</div>` + GUIDE.map((c, i) => `<button data-i="${i}" class="${i === gIdx ? 'on' : ''}"><b>${i + 1}</b>${c.t}</button>`).join('') + `<button class="tourBtn" id="gTour">▶ סיור מודרך במסך</button>`;
  $('#gTitle').textContent = `${gIdx + 1}. ${GUIDE[gIdx].t}`; $('#gBody').innerHTML = GUIDE[gIdx].h(); $('#gBody').scrollTop = 0;
  $('#gPrev').style.visibility = gIdx ? 'visible' : 'hidden'; $('#gNext').style.visibility = gIdx < GUIDE.length - 1 ? 'visible' : 'hidden';
  $$('#gNav button[data-i]').forEach(b => b.onclick = () => { gIdx = +b.dataset.i; renderGuide(); });
  $('#gTour').onclick = () => { closeGuide(); startTour(); };
}
function openGuide(i) { if (i != null) gIdx = i; renderGuide(); $('#guide').classList.add('show'); }
function closeGuide() { $('#guide').classList.remove('show'); try { localStorage.setItem('lumadesk-guide-seen', '1'); } catch (e) { } }
$('#gClose').onclick = closeGuide; $('#gPrev').onclick = () => { gIdx--; renderGuide(); }; $('#gNext').onclick = () => { gIdx++; renderGuide(); };
$('#guide').onclick = ev => { if (ev.target.id === 'guide') closeGuide(); };
const sideTo = t => { if (t !== 'pools' || deskMode !== 'ma') $(`#sideTabs [data-t=${t}]`).click(); }, featTo = f => $(`#featTabs [data-f=${f}]`).click();
const TOUR = [
  ['#viewer', 'הבמה', 'תצוגת התלת־ממד של בריכת הסולטן. לחיצה על גוף בוחרת אותו, Shift+גרירה בוחרת במלבן. גרירה מסובבת את המצלמה, גלגלת עושה זום.'],
  ['#top .tbg', 'זוויות מצלמה', 'נקודות מבט מוכנות: FOH, Front, On Stage, Top, Band, Orchestra, Ring, Wide, Audience, Drums, Old City.'],
  ['#house', 'אורות קהל (House)', 'מעלה ומוריד את תאורת הקהל, כדי לראות את האנשים גם כשהבמה חשוכה.'],
  ['#haze', 'עשן (Haze)', 'כמה רואים את האלומות באוויר. להוריד כשרוצים לראות את הנגנים והפרטים.'],
  ['#groupPool', 'Groups', 'קבוצות גופים מוכנות. לחיצה בוחרת, Shift+לחיצה מוסיפה. 24 = העיגול, 31 = עמודי הבמה, 33 = תאורת קהל.', () => sideTo('pools')],
  ['#presetPool', 'Presets', 'בוחרים סוג (Dimmer, Position, Gobo, Color, Beam) ולוחצים על Preset כדי להחיל אותו על הבחירה. Position Presets מחושבים לכל גוף.', () => sideTo('pools')],
  ['#featTabs', 'טאבי תכונות', 'בוחרים מה מכוונים: Dimmer, Position, Gobo, Color, Beam או Phaser. נקודה אדומה = יש ערכים בפרוגרמר.', () => featTo('pos')],
  ['#encoders', 'אנקודרים', 'גוררים למעלה או למטה לשינוי ערך (Shift = עדין), או דאבל־קליק על המספר כדי להקליד. אדום = ערך בפרוגרמר.'],
  ['#encExtra', 'כלים לכל טאב', () => deskMode === 'ma' ? 'כאן הכלים של הטאב הנבחר: ב־Position יש Aim height, Home, Knockout ו־Fan, ובטאב Phaser יש אפקטים. ה־Focus pad ובוחר הצבע נמצאים בשני מסכי המגע הקטנים שמתחת לאנקודרים: לוחצים על המפה וכל הבחירה מכוונת לשם.'
    : 'כאן, ב־Position, יש Focus pad: לוחצים על מפת הבמה וכל הבחירה מכוונת לשם. בטאב Color יש בוחר צבע, ובטאב Phaser יש אפקטים.'],
  ['.cmdrow', 'שורת פקודה', 'פקודות בסגנון MA: Group 2 At Full, Store Cue 5, Goto Cue 3. מספיק להתחיל להקליד מכל מקום.'],
  ['#kStore', 'STORE', 'הקלטה: לוחצים STORE ואז על שם אקזקיוטר (Cue חדש), על Cue ב־Sequence (עדכון) או על משבצת ריקה ב־Pools.'],
  ['#kClear', 'CLEAR', 'לחיצה ראשונה מנקה בחירה, שנייה מנקה את הפרוגרמר, דאבל־קליק מנקה הכול.'],
  ['#execs', 'אקזקיוטרים', '10 פלייבקים. פיידר מדליק, GO+ ו־GO− מריצים Cues, FLASH מומנטרי. לחיצה על השם בוחרת את האקזקיוטר.'],
  ['#goBig', 'GO', 'ה־Cue הבא באקזקיוטר הנבחר. מקש הרווח עושה את אותו הדבר.'],
  ['#gmFader', 'Grand Master', 'עוצמה כללית לכל המערכת. ליד יש B.O. (בלאקאאוט) ו־TAP לקצב.'],
  ['#sideTabs [data-t=auto]', 'Auto Show', 'מופע אוטומטי בסגנונות (EDM, רוק, מזרחית, תזמורתי…), אפשר מסונכרן לשיר שתטען.', () => sideTo('auto')],
  ['#helpBtn', 'המדריך', 'המדריך המלא תמיד זמין כאן. בהצלחה בהופעה!', () => sideTo(deskMode === 'ma' ? 'sheet' : 'pools')],
];
let tIdx = -1;
function startTour() { tIdx = 0; showTour(); }
function endTour() { tIdx = -1; $('#tourHole').style.display = $('#tourTip').style.display = 'none'; }
function showTour() {
  const [sel, title, txt, before] = TOUR[tIdx], text = typeof txt === 'function' ? txt() : txt; if (before) before();
  requestAnimationFrame(() => { const e = $(sel); if (!e) { endTour(); return; } let r = e.getBoundingClientRect(); const pad = 6, H = $('#tourHole'), T = $('#tourTip');
    // a target inside a scrolling pane (the pools on MA screen 2) is scrolled into the pane; the hole keeps to the visible part
    const sp = e.parentElement.closest('.pane');
    if (sp && sp.scrollHeight > sp.clientHeight) { let s = sp.getBoundingClientRect();
      if (r.top < s.top || r.bottom > s.bottom) { sp.scrollTop += (r.top - s.top) * sp.offsetHeight / s.height - 4; r = e.getBoundingClientRect(); s = sp.getBoundingClientRect(); }
      const L = Math.max(r.left, s.left), Tp = Math.max(r.top, s.top), R = Math.min(r.right, s.right), B = Math.min(r.bottom, s.bottom);
      r = { left: L, top: Tp, right: R, bottom: B, width: R - L, height: B - Tp }; }
    Object.assign(H.style, { display: 'block', left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px' });
    $('#tTitle').textContent = title; $('#tText').textContent = text; $('#tCount').textContent = `${tIdx + 1} / ${TOUR.length}`;
    $('#tPrev').style.visibility = tIdx ? 'visible' : 'hidden'; $('#tNext').style.display = tIdx < TOUR.length - 1 ? '' : 'none';
    T.style.display = 'block'; const tw = 340, th = T.offsetHeight, vw = innerWidth, vh = innerHeight;
    let top = r.bottom + 14; if (top + th > vh - 8) top = r.top - th - 14; if (top < 8) top = clamp(r.top + 14, 8, vh - th - 8);
    let left = r.left + r.width / 2 - tw / 2; if (r.width > vw * .6) left = r.left + 20; T.style.left = clamp(left, 8, vw - tw - 8) + 'px'; T.style.top = top + 'px'; });
}
$('#tNext').onclick = () => { tIdx++; showTour(); }; $('#tPrev').onclick = () => { tIdx--; showTour(); }; $('#tEnd').onclick = endTour;
addEventListener('resize', () => { if (tIdx >= 0) showTour(); });
document.addEventListener('keydown', ev => { if (ev.key === 'Escape') { if (tIdx >= 0) endTour(); if ($('#guide').classList.contains('show')) closeGuide(); } }, true);

/* ====================================================================
   APP FEATURES: file download, video recording, fullscreen, install, offline
==================================================================== */
const stamp = () => { const d = new Date(), z = n => String(n).padStart(2, '0'); return `${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}-${z(d.getHours())}${z(d.getMinutes())}`; };
function downloadBlob(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000); }
const rec = { mr: null, chunks: [], t0: 0 };
$('#recBtn').onclick = () => {
  if (rec.mr) { rec.mr.stop(); return; }
  if (!canvas.captureStream || !window.MediaRecorder) { toast('הדפדפן הזה לא תומך בהקלטת וידאו — נסה Chrome'); return; }
  const stream = canvas.captureStream(30);
  if (song.ctx) { if (!song.recDest) { song.recDest = song.ctx.createMediaStreamDestination(); song.an.connect(song.recDest); } song.recDest.stream.getAudioTracks().forEach(t => stream.addTrack(t)); }
  const mime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'].find(m => MediaRecorder.isTypeSupported(m)) || '';
  try { rec.mr = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12e6 }); } catch (e) { toast('לא ניתן להתחיל הקלטה'); return; }
  rec.chunks = []; rec.t0 = performance.now();
  rec.mr.ondataavailable = e => { if (e.data.size) rec.chunks.push(e.data); };
  rec.mr.onstop = () => { const type = rec.mr.mimeType || 'video/webm'; downloadBlob(new Blob(rec.chunks, { type }), `luma-desk-${stamp()}.${type.includes('mp4') ? 'mp4' : 'webm'}`);
    rec.mr = null; $('#recBtn').classList.remove('on'); $('#recBtn').textContent = '● REC'; toast('הווידאו נשמר להורדות'); };
  rec.mr.start(1000); $('#recBtn').classList.add('on'); toast('מקליט… לחץ שוב על REC לעצירה');
};
setInterval(() => { if (rec.mr) { const s_ = Math.floor((performance.now() - rec.t0) / 1000); $('#recBtn').textContent = `■ ${Math.floor(s_ / 60)}:${String(s_ % 60).padStart(2, '0')}`; } }, 500);
const toggleFs = () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.().catch(() => toast('מסך מלא לא זמין')); };
$('#fsBtn').onclick = toggleFs;
document.addEventListener('keydown', ev => { const tag = document.activeElement?.tagName; if ((ev.key === 'f' || ev.key === 'F') && !ev.ctrlKey && !ev.metaKey && tag !== 'INPUT' && tag !== 'TEXTAREA' && !$('#guide').classList.contains('show')) { ev.preventDefault(); ev.stopImmediatePropagation(); toggleFs(); } }, true);
let installEvt = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; $('#installBtn').style.display = ''; });
$('#installBtn').onclick = async () => { if (!installEvt) return; installEvt.prompt(); await installEvt.userChoice; installEvt = null; $('#installBtn').style.display = 'none'; };
addEventListener('appinstalled', () => { $('#installBtn').style.display = 'none'; toast('LUMA DESK הותקנה'); });
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => { });

/* ====================================================================
   DESK LAYOUT — moves the control sections into one compact console under the stage
==================================================================== */
let keypad = null;
function buildKeypad() {
  keypad = el('div', 'keypad');
  const K_ = [['Fixture', 'w'], ['Group', 'w'], ['Preset', 'w'], ['Cue', 'w'], ['Exec', 'w'], ['⌫', 'bk'],
    ['7', 'n'], ['8', 'n'], ['9', 'n'], ['Thru', 'w'], ['At', 'w'], ['Full', 'w'],
    ['4', 'n'], ['5', 'n'], ['6', 'n'], ['+', 'w'], ['Goto', 'w'], ['Zero', 'w'],
    ['1', 'n'], ['2', 'n'], ['3', 'n'], ['-', 'w'], ['Fade', 'w'], ['Label', 'w'],
    ['0', 'n'], ['.', 'n'], ['Delete', 'w'], ['ENTER', 'en']];
  for (const [t, c] of K_) { const b = el('button', c, t); b.onclick = () => kpPress(t); keypad.appendChild(b); }
}
function kpPress(t) {
  const v = cmd.value;
  if (t === 'ENTER') { if (v.trim()) { hist.unshift(v); if (/^\s*store\s*$/i.test(v)) { setStore(true); cmd.value = ''; return; } runCmd(v); } cmd.value = ''; return; }
  if (t === '⌫') { const w = v.trimEnd(); cmd.value = /[0-9.]$/.test(w) ? w.slice(0, -1) : w.replace(/\S+$/, '').trimEnd() + (w.includes(' ') ? ' ' : ''); if (!cmd.value.trim()) cmd.value = ''; return; }
  if (/^[0-9.]$/.test(t)) { cmd.value = (/[0-9.]$/.test(v) ? v : (v && !v.endsWith(' ') ? v + ' ' : v)) + t; return; }
  cmd.value = (v && !v.endsWith(' ') ? v + ' ' : v) + t + ' ';
}
// maSize: the console's share of the height, set with the grip; undefined = the adaptive default of fitDesk()
const MA_SIZE = .47;
let deskMode = 'ma', deskZoom = 'auto', maForcedTab = null, maSize, maGeo = null;
const saveLayout = () => { try { localStorage.setItem('lumadesk-layout2', JSON.stringify({ deskMode, deskZoom, maSize })); } catch (e) { } };
const PARTS = { featTabs: $('#featTabs'), encBody: $('#encBody'), encoders: $('#encoders'), encExtra: $('#encExtra'), cmdFb: $('#cmdFb'), cmdrow: $('.cmdrow'), keys: $('.keys') };
function restoreParts() {
  const P = PARTS; P.encBody.append(P.encoders, P.encExtra); $('#enc').append(P.featTabs, P.encBody);
  $('#cmdArea').prepend(P.cmdFb, P.cmdrow, P.keys);
  $('#sideTabs').after($('#pane-pools'));
}
function applyLayout() {
  const wasMa = document.body.classList.contains('ma');
  restoreParts();
  const desk = deskMode === 'desk', ma = deskMode === 'ma';
  document.body.classList.toggle('desk', desk); document.body.classList.toggle('ma', ma);
  if (ma) {
    if (!keypad) buildKeypad();
    $('#d1s').appendChild($('#side'));
    $('#d2s').append($('#pane-pools'), PARTS.encExtra);
    $('#d3s').append(PARTS.cmdFb, PARTS.cmdrow);
    $('#pbSlot').appendChild($('#execs')); $('#execs').style.flex = '1';
    $('#ftSlot').appendChild(PARTS.featTabs); $('#ecSlot').appendChild(PARTS.encoders);
    $('#kySlot').appendChild(PARTS.keys); $('#kpSlot').appendChild(keypad);
    $('#msSlot').appendChild($('#master'));
    // Pools is always on screen 2 here, so screen 1 needs one of the remaining tabs; leaving MA gives Pools back
    if (sideTab === 'pools') { sideTo('sheet'); maForcedTab = 'sheet'; }
  } else if (desk) {
    $('#cwScreen').appendChild($('#side'));
    $('#encSlot').appendChild($('#enc'));
    $('#execSlot').appendChild($('#execs')); $('#execs').style.flex = '1';
    const cw = $('#cwCmd'); cw.appendChild($('#cmdArea')); if (!keypad) buildKeypad(); $('#cmdArea').appendChild(keypad);
    $('#cwMaster').appendChild($('#master'));
  } else {
    $('#main').appendChild($('#side'));
    $('#app').insertBefore($('#enc'), $('#desk'));
    $('#desk').insertBefore($('#cmdArea'), $('#desk').firstChild); if (keypad) keypad.remove();
    $('#desk').insertBefore($('#execs'), $('#master') && $('#master').parentNode === $('#desk') ? $('#master') : null); $('#execs').style.flex = '';
    $('#desk').appendChild($('#master'));
  }
  if (!ma && maForcedTab) { if (sideTab === maForcedTab) sideTo('pools'); maForcedTab = null; }
  maGeo = null; renderEncoders(); fitDesk(); resize();
  if (curView === 'foh' && wasMa !== ma) setView('foh', true);
  saveLayout();
}
function fitDesk() {
  const z = deskZoom === 'auto' ? clamp((innerWidth - 24) / 1880, .66, 1.05) : +deskZoom;
  $('#cbody').style.setProperty('--dz', z.toFixed(3));
  const mb = $('#maBody');
  if (deskMode !== 'ma') { maConH = 0; mb.style.setProperty('--mz', (deskZoom === 'auto' ? clamp((innerWidth - 24) / 1920, .55, 1.05) : +deskZoom).toFixed(3)); return; }
  // the projected console (union of its planes) is measured once per layout at zoom 1; it does not depend on the window
  if (!maGeo || !maGeo.W) {
    for (const [k, v] of [['--mz', '1'], ['--mt', '0px'], ['--mb', '0px']]) mb.style.setProperty(k, v);
    const D = mb.getBoundingClientRect(); let L = 1e9, T = 1e9, R = -1e9, B = -1e9;
    for (const e of mb.querySelectorAll('.maScreens,.maDeck,.maFront,.maCheek')) { const r = e.getBoundingClientRect(); L = Math.min(L, r.left); T = Math.min(T, r.top); R = Math.max(R, r.right); B = Math.max(B, r.bottom); }
    maGeo = { W: R - L, H: B - T, mt: D.top - T, mb: B - D.bottom };
  }
  // fit by projected width and by a share of the height under the top bar; without a grip size the share is MA_SIZE,
  // raised (up to .66) in small windows until the zoom reaches .6 so the legends stay readable
  const hz = (innerHeight - 40) / maGeo.H, share = maSize ?? clamp(.6 / hz, MA_SIZE, .66);
  const zm = clamp(Math.min(1.1, innerWidth * .98 / maGeo.W, share * hz), .2, 1.5);
  mb.style.setProperty('--mt', maGeo.mt.toFixed(1) + 'px'); mb.style.setProperty('--mb', maGeo.mb.toFixed(1) + 'px');
  mb.style.setProperty('--mz', zm.toFixed(3));
  maConH = maGeo.H * zm; const C = $('#maConsole').style; C.setProperty('--ch', maConH.toFixed(0) + 'px'); C.setProperty('--cw', (maGeo.W * zm).toFixed(0) + 'px'); $('#viewer').style.setProperty('--ch', maConH.toFixed(0) + 'px');
}
/* MA console hardware: special master faders, touch screens and level wheel */
const SPECS = [['house', 'HOUSE'], ['haze', 'HAZE'], ['aEnergy', 'ENERGY'], ['aMaster', 'AUTO']];
SPECS.forEach(([id, name], i) => {
  const inp = $('#' + id), lo = +inp.min, hi = +inp.max;
  const d = el('div', 'spc', `<span class="sk">S${i + 1}</span><span class="sn">${name}</span><span class="sv"></span><span class="sl"></span><div class="fader"><div class="ff"></div><div class="cap"></div></div>`);
  $('#maSpecs').appendChild(d);
  const fd = d.querySelector('.fader');
  faderDrag(fd, () => (inp.value - lo) / (hi - lo), v => { inp.value = lo + v * (hi - lo); inp.dispatchEvent(new Event('input')); });
  // the original sliders also act on 'change' (Energy starts a new auto look on release): send it only for a real change
  let v0 = inp.value, vc = inp.value; const send = () => { vc = inp.value; inp.dispatchEvent(new Event('change')); };
  d.addEventListener('pointerdown', () => v0 = inp.value, true);
  fd.addEventListener('lostpointercapture', () => { if (inp.value !== v0) send(); });
  fd.addEventListener('dblclick', () => { if (inp.value !== vc) send(); });
});
colorPad($('#tsCol'));
const tsPosDraw = focusPad($('#tsPos'));
let tsPosKey = null;
const curVal = (f, a) => prog.vals[f.id]?.[a] ?? f.base[a];
function updateMaUI() {
  $$('#maSpecs .spc').forEach((d, i) => { const inp = $('#' + SPECS[i][0]), k = (inp.value - inp.min) / (inp.max - inp.min);
    d.style.setProperty('--lv', k); d.querySelector('.sv').textContent = inp.value;
    d.querySelector('.ff').style.height = k * 100 + '%'; d.querySelector('.cap').style.bottom = k * 100 + '%'; });
  const fs = sel.map(id => FX[id]), fc = fs.find(f => has(f, 'r')), mk = $('#tsColMk');
  if (fc) { const r = curVal(fc, 'r'), g = curVal(fc, 'g'), b = curVal(fc, 'b'), mx = Math.max(r, g, b), dl = mx - Math.min(r, g, b);
    const h = !dl ? 0 : mx === r ? ((g - b) / dl + 6) % 6 : mx === g ? (b - r) / dl + 2 : (r - g) / dl + 4;
    Object.assign(mk.style, { display: 'block', left: h / 6 * 100 + '%', top: (1 - (mx ? dl / mx : 0)) * 100 + '%', background: `rgb(${r * 2.55},${g * 2.55},${b * 2.55})` });
    $('#tsColInfo').textContent = `R${Math.round(r)} G${Math.round(g)} B${Math.round(b)}`; }
  else { mk.style.display = 'none'; $('#tsColInfo').textContent = ''; }
  $('#tsColNone').style.display = fc ? 'none' : '';
  $('#tsColNone').textContent = sel.length ? 'NO COLOR IN SELECTION' : 'NO SELECTION · PICKS GO TO LIT FIXTURES';
  const k = sel.join(); if (k !== tsPosKey) { tsPosKey = k; tsPosDraw(); }
  const fp = fs.find(f => has(f, 'pan'));
  $('#tsPosInfo').textContent = fp ? `PAN ${Math.round(curVal(fp, 'pan'))}° TILT ${Math.round(curVal(fp, 'tilt'))}°` : '';
  $('#tsPosNone').style.display = sel.length ? 'none' : '';
  const fd = fs.find(f => has(f, 'dim')); $('#lvlVal').textContent = fd ? Math.round(curVal(fd, 'dim')) : '—';
}
{
  const w = $('#lvlWheel'); let lastY = 0, acc = 0, map = null;
  const turn = (d, fine) => { acc -= d; w.style.backgroundPositionY = acc + 'px'; encDelta('dim', d * 100 / 320 * (fine ? .1 : 1)); };
  w.onpointerdown = ev => { w.setPointerCapture(ev.pointerId); map = boxMap(w); lastY = map(ev)[1] * map.h; ev.preventDefault(); };
  w.onpointermove = ev => { if (!w.hasPointerCapture(ev.pointerId)) return; const y = map(ev)[1] * map.h, dy = lastY - y; lastY = y; turn(dy, ev.shiftKey); };
  w.onwheel = ev => { ev.preventDefault(); turn(-Math.sign(ev.deltaY) * 3.2, ev.shiftKey); };
}
$('#layoutSel').onchange = ev => { deskMode = ev.target.value; applyLayout(); };
$('#deskZoom').onchange = ev => { deskZoom = ev.target.value; fitDesk(); resize(); saveLayout(); };
{
  const g = $('#maGrip'); let raf = 0;
  const apply = () => { raf = 0; fitDesk(); resize(); };
  g.onpointerdown = ev => { g.setPointerCapture(ev.pointerId); g.classList.add('on'); ev.preventDefault(); ev.stopPropagation(); };
  g.onpointermove = ev => { if (!g.hasPointerCapture(ev.pointerId)) return; maSize = clamp((innerHeight - ev.clientY) / (innerHeight - 40), .3, .7); if (!raf) raf = requestAnimationFrame(apply); };
  g.onlostpointercapture = () => { g.classList.remove('on'); saveLayout(); };
  g.ondblclick = () => { maSize = undefined; fitDesk(); resize(); saveLayout(); };
}
addEventListener('resize', () => { if (deskMode !== 'classic') fitDesk(); });
// the panes on the console screens are scrolled here: Chromium does not scroll them by wheel inside the 3D console;
// 20px steps (just under one 21px sheet row) keep the Fixture Sheet's row snapping moving forward with fine (touchpad) deltas
{ let acc = 0;
  $('#maBody').addEventListener('wheel', ev => {
    let p = ev.defaultPrevented ? null : ev.target.closest('#groupPool,.pane,#encExtra');
    // at the end of the groups list the wheel goes on to the pane around it
    if (p && p.id === 'groupPool' && (ev.deltaY > 0 ? p.scrollTop + p.clientHeight >= p.scrollHeight - 1 : p.scrollTop <= 0)) p = p.closest('.pane');
    if (!p || p.scrollHeight <= p.clientHeight) return;
    ev.preventDefault(); acc += ev.deltaMode ? ev.deltaY * 20 : ev.deltaY; const n = Math.trunc(acc / 20);
    if (n) { acc -= n * 20; p.scrollBy({ top: n * 20 }); }
  }, { passive: false }); }
// clear key clears a half-typed command line first (like MA); STORE pre-types "Store"
{ const kc = $('#kClear'); const old = kc.onclick; kc.onclick = () => { if (cmd.value.trim()) { cmd.value = ''; return; } old(); }; }
setInterval(() => {
  if (deskMode === 'ma') {
    const e = execs[selExec], F = FEATS.find(f => f[0] === feat);
    $('#d1info').textContent = (sideTab || '').toUpperCase(); $('#d2info').textContent = `${F ? F[1].toUpperCase() : ''} · ${sel.length} SEL`;
    $('#d3info').textContent = `EXEC ${selExec + 1} ${e.name || ''}`;
    return;
  }
  if (deskMode !== 'desk') return;
  const e = execs[selExec]; $('#cwPbInfo').textContent = `EXEC ${selExec + 1} · ${e.name || 'empty'}`;
  $('#cwProgInfo').textContent = `${sel.length} SELECTED`; $('#cwScreenInfo').textContent = (sideTab || '').toUpperCase();
}, 250);
try { const L = JSON.parse(localStorage.getItem('lumadesk-layout2') || 'null'); if (L) { deskMode = L.deskMode || 'ma'; deskZoom = L.deskZoom || 'auto';
  // earlier versions stored MA_SIZE without a grip drag: read it as the adaptive default
  const s = +L.maSize; if (Number.isFinite(s) && s > 0 && s !== MA_SIZE) maSize = clamp(s, .3, .7); } } catch (e) { }
$('#layoutSel').value = deskMode; $('#deskZoom').value = deskZoom;
applyLayout();

/* boot */
renderFeatTabs(); renderEncoders(); buildExecs(); renderAuto();
let loaded = false;
try { const s = localStorage.getItem(LS); if (s) { loadShow(JSON.parse(s)); loaded = execs.some(e => e.cues.length); if (loaded && execs[0].cues.length) { gotoCue(execs[0], 0, 0); if (!execs[0].level) execs[0].level = 1; } } } catch (e) { }
if (!loaded) buildDemo();
try { if (!localStorage.getItem('lumadesk-guide-seen')) setTimeout(() => openGuide(0), 600); } catch (e) { }
requestAnimationFrame(loop);
window.__desk = { renderer, THREE, perf: performers, prog, applyPreset, runCmd, execs, setView, FX, sel: () => sel, execGo, gotoCue, scene, camera, controls, fixtures, puffs, groups: () => groups };
// TEST HOOK (see the "?test" block in <head>): read-only views and drivers for the Playwright suite; absent without "?test"
if (window.__deskClock) {
  const C = window.__deskClock, fbLog = new MutationObserver(() => { });
  fbLog.observe($('#cmdFb'), { childList: true });
  const state = () => deep({ sel, prog: prog.vals, progFx: prog.fxList, selExec, highlight, blackout, deskMode,
    execs: execs.map(e => ({ name: e.name, cur: e.cur, on: e.on, level: e.level, cues: e.cues.map(c => [c.num, c.name, c.fade]) })) });
  window.__desk.test = { ...C, state, serialize: () => deep(serialize()),
    // move to an absolute time (seconds, never backwards) and return the output of every fixture there
    outputAt: sec => {
      if (sec * 1000 > C.now()) C.advance(sec * 1000 - C.now());
      const now = C.now() / 1000; stepFades(now); computeOutput(now);
      return fixtures.map(f => ({ id: f.id, ...f.out }));
    },
    // run one command line and return the log lines it wrote plus the state after it
    run: line => {
      fbLog.takeRecords(); runCmd(line);
      const added = fbLog.takeRecords().flatMap(m => [...m.addedNodes]);
      return { line, log: added.map(n => [n.firstChild?.className || '', n.textContent]), state: state() };
    } };
}
