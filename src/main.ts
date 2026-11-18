// @ts-nocheck
import * as THREE from 'three';
import { clamp, cssRgb, EventBus, hsv, jsonClone, lerp, performanceClock } from './core';
import { aimAt } from './domain/aim';
import { ATTR, FEAT_ATTRS, FEATS, GOBO_NAMES, SCREEN_MODES } from './domain/attributes';
import { buildRig } from './domain/rig';
import { BAND_PTS, DECK, RING, SCREEN, STAGE } from './domain/venue';
import { AppState } from './engine/AppState';
import { defaultGroups } from './engine/defaultGroups';
import type { EngineEvents } from './engine/events';
import { ExecutorPool } from './engine/ExecutorPool';
import { GroupLibrary } from './engine/GroupLibrary';
import { OutputMerger } from './engine/OutputMerger';
import { COLORS } from './engine/presetColors';
import { PresetLibrary } from './engine/PresetLibrary';
import { PRESET_TYPES } from './engine/presetTypes';
import { Programmer } from './engine/Programmer';
import { Selection } from './engine/Selection';
import { PHASER_TYPES } from './engine/shared';
import { Tempo } from './engine/Tempo';
import { colorByName } from './engine/colorByName';
import { CommandRunner } from './command/CommandRunner';
import { DemoShow, GuideFlag, LayoutPrefs, restoreShow, ShowSerializer, ShowStorage } from './show';
import { AutoShow } from './autoshow/AutoShow';
import { buildLookList } from './autoshow/buildLookList';
import { LookGenerator } from './autoshow/LookGenerator';
import { savedLookCue } from './autoshow/savedLookCue';
import { sectionName } from './autoshow/sections';
import { STYLES } from './autoshow/styles';
import { SongPlayer } from './audio/SongPlayer';
import { he } from './i18n/he';
import { CameraViews } from './render/camera/CameraViews';
import { VIEWS, type ViewName } from './render/camera/viewTable';
import {
  createBeamShared,
  createFixtureModels,
  createGoboAtlas,
  createLensTextures,
  createModelMaterials,
  createTrimMaterial,
  FixtureVisualBuilder,
  FixtureVisualSync,
  ModelPrimitives,
  Props,
} from './render/fixtures';
import { addEnvironmentLights } from './render/lights/addEnvironmentLights';
import { KeyLights } from './render/lights/KeyLights';
import { LightFrame } from './render/lights/LightFrame';
import { SceneLights } from './render/lights/SceneLights';
import { FixturePicker } from './render/picking/FixturePicker';
import { projectToScreen } from './render/shared';
import { createStageGraphics } from './render/stage/createStageGraphics';
import { FixtureIdOverlay } from './render/stage/FixtureIdOverlay';
import { PostFx } from './render/stage/PostFx';
import { StageRenderer } from './render/stage/StageRenderer';
import { animateCrowd } from './render/venue/crowdAnimation';
import { animatePerformers } from './render/venue/performersAnimation';
import { buildVenue } from './render/venue/Venue';

/* ====================================================================
   HELPERS
==================================================================== */
const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)];
const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
};
let toastT;
function toast(m) {
  const t = $('#toast');
  t.textContent = m;
  t.style.display = 'block';
  clearTimeout(toastT);
  toastT = setTimeout(() => (t.style.display = 'none'), 1800);
}

/* ====================================================================
   VENUE / RIG DEFINITION
==================================================================== */
const rig = buildRig();
const fixtures = rig.fixtures;
const FX = Object.fromEntries(fixtures.map((f) => [f.id, f]));

/* ====================================================================
   SHOW DATA: the engine (state, playback, programmer) and its event bus
==================================================================== */
const bus = new EventBus<EngineEvents>();
const clock = performanceClock;
const appState = new AppState(bus);
const selection = new Selection(rig, bus);
const tempo = new Tempo();
const groupLibrary = new GroupLibrary(bus);
const presetLibrary = new PresetLibrary(bus);
const pool = new ExecutorPool(clock, bus);
const { execs, autoExec } = pool;
const programmer = new Programmer({ rig, selection, presets: presetLibrary, pool, state: appState, clock, bus });
const merger = new OutputMerger({ rig, pool, programmer, master: appState, selection, tempo });
const runner = new CommandRunner({
  rig,
  selection,
  programmer,
  pool,
  state: appState,
  groups: groupLibrary,
  presets: presetLibrary,
  bus,
});

/* ====================================================================
   THREE.JS SCENE: three.js draws each object's uuid from the seeded Math.random, so the
   creation order below is render parity (decision 24); the engine above creates no
   three.js object and draws no random number
==================================================================== */
const canvas = $('#c');
const { renderer, scene } = createStageGraphics(canvas);
// MA layout: FOH is the operator's standing eye at the control position in the audience, behind the console overlay;
// the scene's raised FOH riser and its desk are hidden there (they would show as a second, empty desk)
const views = new CameraViews(canvas, {
  isMaLayout: () => document.body.classList.contains('ma'),
  onViewChanged: (view) => $$('[data-view]').forEach((b) => b.classList.toggle('on', b.dataset.view === view)),
});
const { camera, controls } = views;
// the view buttons and the test hook pass plain strings; an unknown name leaves the camera where it is
const isViewName = (view: string): view is ViewName => Object.hasOwn(VIEWS, view);
function setView(view: string, instant?: boolean): void {
  if (isViewName(view)) views.setView(view, instant);
}
setView('foh', true);
const postFx = new PostFx(renderer, scene, camera);
addEnvironmentLights(scene);
const venue = buildVenue(scene);
const sceneLights = new SceneLights(scene, venue.wallFloodlight);

/* --- fixture visuals --- */
const gobo = createGoboAtlas();
const beamShared = createBeamShared();
const trimMaterial = createTrimMaterial();
const lensTextures = createLensTextures();
const keyLights = new KeyLights(scene);
const prims = new ModelPrimitives();
const modelKit = { prims, materials: createModelMaterials(trimMaterial) };
const picker = new FixturePicker(canvas, camera);
const visualBuilder = new FixtureVisualBuilder({
  scene,
  prims,
  beam: beamShared,
  gobo,
  models: createFixtureModels(modelKit),
  lensTextures,
  screenMesh: venue.ledWall.screen,
  picker,
});
const visuals = fixtures.map((f) => visualBuilder.build(f));
const props = new Props({ scene, kit: modelKit, fohRig: venue.fohRig, state: appState, beamHaze: beamShared.haze });
views.fohRig.add(...venue.fohRig);
const lightFrame = new LightFrame();
const visualSync = new FixtureVisualSync({
  visuals,
  selection,
  screen: { uniforms: venue.ledWall.uniforms, light: sceneLights.screenLight, strip: venue.ledWall.strip },
  beamTime: beamShared.time,
  goboTextures: gobo.textures,
  lights: lightFrame,
});
const stageRenderer = new StageRenderer({
  renderer,
  scene,
  views,
  postFx,
  overlay: new FixtureIdOverlay($('#ov'), fixtures, (id) => selection.has(id)),
  viewer: $('#viewer'),
});

/* ====================================================================
   COMMAND LINE
==================================================================== */
function log(msg, cls = '') {
  const fb = $('#cmdFb');
  const d = el('div', '', '');
  d.innerHTML = `<span class="${cls}">${msg}</span>`;
  fb.appendChild(d);
  while (fb.children.length > 2) fb.firstChild.remove();
}

/* ====================================================================
   UI
==================================================================== */
const uiDirty = { all: true };
// side tabs
let sideTab = 'pools';
$$('#sideTabs button').forEach(
  (b) =>
    (b.onclick = () => {
      sideTab = b.dataset.t;
      $$('#sideTabs button').forEach((x) => x.classList.toggle('on', x === b));
      $$('.pane').forEach((p) => p.classList.toggle('on', p.id === 'pane-' + sideTab));
      uiDirty.all = true;
    }),
);
$$('[data-view]').forEach((b) => (b.onclick = () => setView(b.dataset.view)));

/* pools */
let presetTab = 4;
const GROUP_SLOTS = 48; // a full grid: 6 x 8 in Desk/Classic, 12 x 4 in the MA layout
function renderPools() {
  const gp = $('#groupPool');
  gp.innerHTML = '';
  for (let n = 1; n <= GROUP_SLOTS; n++) {
    const g = groupLibrary.all[n],
      d = el(
        'div',
        'slot grp' + (g ? '' : ' empty'),
        `<span class="n">${n}</span><span class="t">${g ? g.name : '—'}</span>`,
      );
    if (g) d.title = `${g.ids.length} fixtures`;
    d.onclick = (ev) => {
      if (appState.storeMode) {
        groupLibrary.store(n, selection.ids);
        appState.setStoreMode(false);
        return;
      }
      if (!g) return;
      selection.set([...g.ids], ev.shiftKey ? 'add' : 'replace');
      log(`Group ${n} "${g.name}" (${g.ids.length})`, 'ok');
    };
    d.ondblclick = () => {
      if (!g) return;
      openRename(`Group ${n}`, g.name, (v) => {
        g.name = v;
        renderPools();
        showStorage.persist();
      });
    };
    gp.appendChild(d);
  }
  const pt = $('#presetTabs');
  pt.innerHTML = '';
  for (const t in PRESET_TYPES) {
    const b = el('button', +t === presetTab ? 'on' : '', `${t} ${PRESET_TYPES[t]}`);
    b.onclick = () => {
      presetTab = +t;
      renderPools();
    };
    pt.appendChild(b);
  }
  const pp = $('#presetPool');
  pp.innerHTML = '';
  for (let n = 1; n <= 30; n++) {
    const pr = presetLibrary.all[presetTab][n];
    const d = el(
      'div',
      'slot' + (pr ? '' : ' empty'),
      `<span class="n">${presetTab}.${n}</span><span class="t">${pr ? pr.name : '—'}</span>`,
    );
    if (pr && presetTab === 4 && pr.vals) {
      const c = cssRgb(pr.vals.r, pr.vals.g, pr.vals.b);
      const sw = el('i', 'sw');
      sw.style.background = c;
      sw.style.color = c;
      d.appendChild(sw);
    }
    if (pr && presetTab === 3 && pr.gobo != null) {
      const im = el('img', 'gi');
      im.src = gobo.icons[pr.gobo];
      d.appendChild(im);
    }
    d.onclick = () => {
      if (appState.storeMode) {
        presetLibrary.storeFromProgrammer(presetTab, n, selection.ids, programmer.vals);
        appState.setStoreMode(false);
        return;
      }
      if (pr) programmer.applyPreset(presetTab, n);
    };
    d.ondblclick = () => {
      if (!pr) return;
      openRename(`Preset ${presetTab}.${n}`, pr.name, (v) => {
        pr.name = v;
        renderPools();
        showStorage.persist();
      });
    };
    pp.appendChild(d);
  }
}

/* feature tabs + encoders */
let feat = 'dim';
function renderFeatTabs() {
  const ft = $('#featTabs');
  ft.innerHTML = '';
  for (const [k, n] of FEATS) {
    const b = el('button', k === feat ? 'on' : '', n);
    b.dataset.f = k;
    b.onclick = () => {
      feat = k;
      renderFeatTabs();
      renderEncoders();
    };
    ft.appendChild(b);
  }
}
const ENC_DEF = {
  dim: ['dim'],
  pos: ['pan', 'tilt'],
  gobo: ['gobo', 'grot'],
  color: ['r', 'g', 'b'],
  beam: ['zoom', 'strobe'],
  fx: ['rate', 'size', 'spread'],
};
const FXP = {
  rate: { label: 'Rate', min: 0.125, max: 8, unit: 'x' },
  size: { label: 'Size', min: 0, max: 180, unit: '' },
  spread: { label: 'Phase', min: 0, max: 1440, unit: '°' },
};
function encRange(a) {
  return ATTR[a] || FXP[a];
}
// the MA console keeps all five encoders live: current feature first, then other attributes in this fixed order
const ENC_FILL = ['dim', 'pan', 'tilt', 'r', 'g', 'b', 'zoom', 'strobe', 'gobo', 'grot'];
function encList() {
  const L = ENC_DEF[feat];
  return deskMode === 'ma' ? [...L, ...ENC_FILL.filter((a) => !L.includes(a))].slice(0, Math.max(5, L.length)) : L;
}
function renderEncoders() {
  const E = $('#encoders');
  E.innerHTML = '';
  for (const a of encList()) {
    const R = encRange(a);
    const d = el(
      'div',
      'encoder',
      `<div class="lb">${R.label}</div><div class="knob"><div class="ind"></div></div><div class="val">—</div>`,
    );
    d.dataset.a = a;
    E.appendChild(d);
    const knob = d.querySelector('.knob'),
      stp = ATTR[a]?.step;
    let lastY = 0,
      map = null,
      rem = 0;
    // stepped attributes (gobo) collect the fractions of a drag until they make a whole step
    const turn = (v) => {
      if (!stp) {
        encDelta(a, v);
        return;
      }
      rem += v;
      const n = Math.trunc(rem / stp) * stp;
      if (n) {
        rem -= n;
        encDelta(a, n);
      }
    };
    knob.onpointerdown = (ev) => {
      knob.setPointerCapture(ev.pointerId);
      map = boxMap(knob);
      lastY = map(ev)[1] * map.h;
      rem = 0;
      ev.preventDefault();
    };
    knob.onpointermove = (ev) => {
      if (!knob.hasPointerCapture(ev.pointerId)) return;
      const y = map(ev)[1] * map.h,
        dy = lastY - y;
      lastY = y;
      turn(((dy * (R.max - R.min)) / 320) * (ev.shiftKey ? 0.1 : 1));
    };
    knob.onwheel = (ev) => {
      ev.preventDefault();
      const s = -Math.sign(ev.deltaY);
      if (stp) encDelta(a, s * stp);
      else encDelta(a, ((s * (R.max - R.min)) / 100) * (ev.shiftKey ? 0.1 : 1));
    };
    d.querySelector('.val').ondblclick = () => openNumber(R.label, (v) => encAbs(a, v));
  }
  renderEncExtra();
}
function encDelta(a, d) {
  if (!selection.ids.length && ['r', 'g', 'b'].includes(a)) {
    const ids = programmer.colorTargets();
    if (!ids.length) return;
    selection.set(ids);
  }
  if (!selection.ids.length) {
    toast('בחר קודם גופים (Select fixtures first)');
    return;
  }
  if (a in FXP) {
    const insts = programmer.phasersOnSelection();
    if (!insts.length) {
      toast('No phaser on selection');
      return;
    }
    for (const I of insts) I[a] = clamp(I[a] + d, FXP[a].min, FXP[a].max);
    return;
  }
  const n = selection.ids.length;
  selection.ids.forEach((id, k) => {
    const f = FX[id];
    if (!f.has(a)) return;
    const cur = programmer.vals[id]?.[a] ?? f.base[a] ?? ATTR[a].def;
    const m = appState.fanMode && n > 1 ? lerp(-1, 1, k / (n - 1)) : 1;
    programmer.set(id, a, cur + d * m);
  });
}
function encAbs(a, v) {
  if (a in FXP) {
    for (const I of programmer.phasersOnSelection()) I[a] = clamp(v, FXP[a].min, FXP[a].max);
    return;
  }
  selection.ids.forEach((id) => programmer.set(id, a, v));
}
function fmtVal(a, v) {
  if (v == null) return '—';
  if (a === 'gobo')
    return feat === 'gobo' && selection.ids.length && FX[selection.ids[0]].type === 'screen'
      ? SCREEN_MODES[Math.round(v)]
      : `${Math.round(v)} ${GOBO_NAMES[Math.round(v)] || ''}`;
  const R = encRange(a);
  return (Math.abs(v) < 10 && a !== 'dim' ? (+v).toFixed(1) : Math.round(v)) + (R.unit || '');
}
function updateEncUI() {
  const f0 = selection.ids.map((id) => FX[id])[0];
  $$('#encoders .encoder').forEach((d) => {
    const a = d.dataset.a,
      R = encRange(a);
    let v = null,
      p = false,
      en = true;
    if (a in FXP) {
      const I = programmer.phasersOnSelection()[0];
      en = !!I;
      if (I) {
        v = I[a];
        p = true;
      }
    } else {
      const f = selection.ids.map((id) => FX[id]).find((f) => f.has(a));
      en = !!f;
      if (f) {
        const pv = programmer.vals[f.id]?.[a];
        p = pv != null;
        v = p ? pv : f.base[a];
      }
    }
    d.classList.toggle('dis', !en && selection.ids.length > 0);
    const vv = d.querySelector('.val');
    vv.textContent = fmtVal(a, v);
    vv.classList.toggle('p', p);
    const k = v == null ? 0 : (v - R.min) / (R.max - R.min);
    d.querySelector('.knob').style.setProperty('--kv', clamp(k, 0, 1) * 270 + 'deg');
    d.querySelector('.knob').style.setProperty('--kc', p ? '#ff4040' : '#ffc21a');
    d.querySelector('.ind').style.transform = `rotate(${-135 + clamp(k, 0, 1) * 270}deg)`;
  });
  // feature dots
  $$('#featTabs button').forEach((b) => {
    const ft = b.dataset.f;
    let hasP = false;
    if (ft === 'fx') hasP = programmer.fxList.length > 0;
    else
      for (const id in programmer.vals)
        if (FEAT_ATTRS[ft].some((a) => programmer.vals[id][a] != null)) {
          hasP = true;
          break;
        }
    b.classList.toggle('has', hasP);
  });
}
function btnGrid(cols, items) {
  const g = el('div', 'btnGrid');
  g.style.gridTemplateColumns = `repeat(${cols},auto)`;
  for (const [t, fn, cls] of items) {
    const b = el('button', cls || '', t);
    b.onclick = fn;
    g.appendChild(b);
  }
  return g;
}
// Pointer -> position in the element's own untransformed border box (0..1), correct under the MA console's CSS 3D
// perspective and zoom: zero-size probes at the four corners give the projected quad, and the inverse of the
// square-to-quad homography maps the pointer back. Built once per gesture, so a drag never forces layout per move.
function boxMap(elm) {
  const own = !(elm instanceof HTMLCanvasElement),
    host = own ? elm : elm.offsetParent,
    w = elm.offsetWidth,
    h = elm.offsetHeight;
  const ox = own ? -elm.clientLeft : elm.offsetLeft,
    oy = own ? -elm.clientTop : elm.offsetTop;
  const pr = [
    [0, 0],
    [w, 0],
    [w, h],
    [0, h],
  ].map(([x, y]) => {
    const i = document.createElement('i');
    i.style.cssText = `position:absolute;display:block;left:${ox + x}px;top:${oy + y}px;width:0;height:0;margin:0;padding:0;border:0;transform:none`;
    host.appendChild(i);
    return i;
  });
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = pr.map((i) => {
    const r = i.getBoundingClientRect();
    return [r.left, r.top];
  });
  pr.forEach((i) => i.remove());
  const dx1 = x1 - x2,
    dx2 = x3 - x2,
    dx3 = x0 - x1 + x2 - x3,
    dy1 = y1 - y2,
    dy2 = y3 - y2,
    dy3 = y0 - y1 + y2 - y3,
    den = dx1 * dy2 - dx2 * dy1;
  if (!den || !isFinite(den)) {
    const r = elm.getBoundingClientRect(),
      f = (ev) => [(ev.clientX - r.left) / r.width, (ev.clientY - r.top) / r.height];
    f.w = r.width;
    f.h = r.height;
    return f;
  }
  const g = (dx3 * dy2 - dx2 * dy3) / den,
    k = (dx1 * dy3 - dx3 * dy1) / den,
    a = x1 - x0 + g * x1,
    b = x3 - x0 + k * x3,
    d = y1 - y0 + g * y1,
    e = y3 - y0 + k * y3;
  const A = e - y0 * k,
    B = x0 * k - b,
    C = b * y0 - x0 * e,
    D = y0 * g - d,
    E = a - x0 * g,
    F = x0 * d - a * y0,
    G = d * k - e * g,
    H = b * g - a * k,
    I = a * e - b * d;
  const z = elm.currentCSSZoom || 1,
    f = (ev) => {
      const X = ev.clientX,
        Y = ev.clientY,
        q = G * X + H * Y + I;
      return [(A * X + B * Y + C) / q, (D * X + E * Y + F) / q];
    };
  f.w = w * z;
  f.h = h * z;
  return f;
}
// pads are built once for the MA touch screens and per feature change inside #encExtra for the other layouts
let aimH = 1.4;
function focusPad(c) {
  const mx = (x) => ((x + 25) / 50) * c.width,
    mz = (z) => ((z + 22) / 28) * c.height,
    ix = (px) => (px / c.width) * 50 - 25,
    iz = (py) => (py / c.height) * 28 - 22;
  const draw = (pt) => {
    const x = c.getContext('2d');
    x.fillStyle = '#050506';
    x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = '#16161a';
    x.fillRect(mx(STAGE.x0), mz(STAGE.z0), mx(STAGE.x1) - mx(STAGE.x0), mz(STAGE.z1) - mz(STAGE.z0));
    x.fillStyle = '#1f2a44';
    x.fillRect(mx(SCREEN.x0), mz(SCREEN.z) - 2, mx(SCREEN.x1) - mx(SCREEN.x0), 3);
    x.strokeStyle = '#3a3a44';
    x.beginPath();
    x.ellipse(mx(RING.x), mz(RING.z), (RING.R / 50) * c.width, (RING.R / 28) * c.height, 0, 0, 7);
    x.stroke();
    x.fillStyle = '#555';
    for (const [px, pz] of [
      ...BAND_PTS,
      ...[-21.6, -19.5, -17.4, -15.3, -13.3, 13.3, 15.3, 17.4, 19.5, 21.6].flatMap((x) => [
        [x, -8.7],
        [x, -11.6],
        [x, -14.6],
      ]),
    ]) {
      x.beginPath();
      x.arc(mx(px), mz(pz), 3, 0, 7);
      x.fill();
    }
    x.fillStyle = '#ffc21a88';
    for (const id of selection.ids) {
      const f = FX[id];
      x.fillRect(mx(f.pos.x) - 1, mz(f.pos.z) - 1, 2, 2);
    }
    x.fillStyle = '#888';
    x.font = '9px Inter';
    x.fillText('UPSTAGE', 4, 10);
    x.fillText('AUDIENCE ↓', 4, c.height - 4);
    if (pt) {
      x.strokeStyle = '#ff4040';
      x.beginPath();
      x.arc(pt[0], pt[1], 6, 0, 7);
      x.moveTo(pt[0] - 10, pt[1]);
      x.lineTo(pt[0] + 10, pt[1]);
      x.moveTo(pt[0], pt[1] - 10);
      x.lineTo(pt[0], pt[1] + 10);
      x.stroke();
    }
  };
  draw();
  let map = null;
  const aim = (ev) => {
    const [u, v] = map(ev),
      px = u * c.width,
      py = v * c.height;
    const X3 = ix(px),
      Z3 = iz(py),
      on = X3 > STAGE.x0 && X3 < STAGE.x1 && Z3 > STAGE.z0 && Z3 < STAGE.z1;
    const Y3 = (on ? DECK : 0) + aimH;
    selection.ids.forEach((id) => {
      const f = FX[id];
      if (!f.T.moving) return;
      const a = aimAt(f, X3, Y3, Z3);
      programmer.set(id, 'pan', a.pan);
      programmer.set(id, 'tilt', a.tilt);
    });
    draw([px, py]);
  };
  c.onpointerdown = (ev) => {
    if (!selection.ids.length) {
      toast('בחר קודם גופים (Select fixtures first)');
      return;
    }
    c.setPointerCapture(ev.pointerId);
    map = boxMap(c);
    aim(ev);
  };
  c.onpointermove = (ev) => {
    if (c.hasPointerCapture(ev.pointerId)) aim(ev);
  };
  return draw;
}
function colorPad(c) {
  const x = c.getContext('2d');
  for (let px = 0; px < c.width; px++)
    for (let py = 0; py < c.height; py++) {
      const [r, g, b] = hsv(px / c.width, 1 - py / c.height, 1);
      x.fillStyle = `rgb(${r * 255},${g * 255},${b * 255})`;
      x.fillRect(px, py, 1, 1);
    }
  const pick = (ev) => {
    const [u, v] = map(ev),
      h = clamp(u, 0, 1),
      s = clamp(1 - v, 0, 1);
    const [r, g, b] = hsv(h, s, 1);
    pickIds.forEach((id) => {
      programmer.set(id, 'r', r * 100);
      programmer.set(id, 'g', g * 100);
      programmer.set(id, 'b', b * 100);
    });
  };
  let pickIds = [],
    map = null;
  c.onpointerdown = (ev) => {
    pickIds = programmer.colorTargets();
    if (!pickIds.length) return;
    c.setPointerCapture(ev.pointerId);
    map = boxMap(c);
    pick(ev);
  };
  c.onpointermove = (ev) => {
    if (c.hasPointerCapture(ev.pointerId)) pick(ev);
  };
}
function renderEncExtra() {
  const X = $('#encExtra');
  X.innerHTML = '';
  const knock = () => {
    programmer.removeFeature(selection.ids, feat);
    log(`Knockout ${feat} from selection`);
  };
  if (feat === 'dim') {
    const w = el('div');
    w.appendChild(el('div', 'xlabel', 'Quick level'));
    w.appendChild(
      btnGrid(6, [
        ['Full', () => encAbs('dim', 100)],
        ['75', () => encAbs('dim', 75)],
        ['50', () => encAbs('dim', 50)],
        ['25', () => encAbs('dim', 25)],
        ['10', () => encAbs('dim', 10)],
        ['Zero', () => encAbs('dim', 0)],
      ]),
    );
    X.appendChild(w);
    const w2 = el('div');
    w2.appendChild(el('div', 'xlabel', 'Programmer'));
    w2.appendChild(btnGrid(1, [['Knockout Dimmer', knock]]));
    X.appendChild(w2);
    X.appendChild(
      el(
        'div',
        'hint',
        'Drag the encoder up/down (Shift = fine), mouse-wheel, or double-click the value to type. Command line: <b>At 75</b>, <b>Full</b>.',
      ),
    );
  }
  if (feat === 'pos') {
    if (deskMode !== 'ma') {
      const w = el('div');
      w.appendChild(el('div', 'xlabel', 'Focus pad — click/drag on the stage map to aim selection'));
      const c = el('canvas', 'pad');
      c.width = 300;
      c.height = 118;
      w.appendChild(c);
      X.appendChild(w);
      focusPad(c);
    }
    const hRow = el('div');
    hRow.appendChild(el('div', 'xlabel', 'Aim height'));
    const hs = el('input');
    hs.type = 'range';
    hs.min = 0;
    hs.max = 12;
    hs.step = 0.1;
    hs.value = aimH;
    hs.style.width = '120px';
    hs.oninput = () => (aimH = +hs.value);
    hRow.appendChild(hs);
    hRow.appendChild(el('div', 'xlabel', '&nbsp;'));
    hRow.appendChild(
      btnGrid(2, [
        [
          'Home',
          () =>
            selection.ids.forEach((id) => {
              programmer.set(id, 'pan', 0);
              programmer.set(id, 'tilt', 0);
            }),
        ],
        ['Knockout', knock],
        [
          'Fan ' + (appState.fanMode ? 'ON' : 'off'),
          () => {
            appState.fanMode = !appState.fanMode;
            $('#kFan').classList.toggle('on', appState.fanMode);
            renderEncExtra();
          },
          appState.fanMode ? 'on' : '',
        ],
        ['Center', () => programmer.applyPreset(2, 2)],
      ]),
    );
    X.appendChild(hRow);
  }
  if (feat === 'gobo') {
    const w = el('div');
    const isScreen = selection.ids.length && FX[selection.ids[0]].type === 'screen';
    w.appendChild(el('div', 'xlabel', isScreen ? 'LED screen content' : 'Gobo wheel'));
    const r = el('div', 'goboRow');
    if (isScreen)
      SCREEN_MODES.forEach((n, i) => {
        const b = el('button', '', `<span style="font-size:11px">${n}</span>`);
        b.style.width = '70px';
        b.onclick = () => encAbs('gobo', i);
        r.appendChild(b);
      });
    else
      GOBO_NAMES.forEach((n, i) => {
        const b = el('button', '', `<img src="${gobo.icons[i]}">${n}`);
        b.onclick = () => encAbs('gobo', i);
        r.appendChild(b);
      });
    w.appendChild(r);
    X.appendChild(w);
    const w2 = el('div');
    w2.appendChild(el('div', 'xlabel', 'Rotation'));
    w2.appendChild(
      btnGrid(2, [
        ['◀ Fast', () => encAbs('grot', -60)],
        ['Fast ▶', () => encAbs('grot', 60)],
        ['◀ Slow', () => encAbs('grot', -12)],
        ['Slow ▶', () => encAbs('grot', 12)],
        ['Stop', () => encAbs('grot', 0)],
        ['Knockout', knock],
      ]),
    );
    X.appendChild(w2);
  }
  if (feat === 'color') {
    if (deskMode !== 'ma') {
      const w = el('div');
      w.appendChild(el('div', 'xlabel', 'Color picker'));
      const c = el('canvas', 'pad');
      c.width = 230;
      c.height = 112;
      w.appendChild(c);
      X.appendChild(w);
      colorPad(c);
    }
    const w2 = el('div');
    w2.appendChild(el('div', 'xlabel', 'Swatches (Color presets 4.x)'));
    const sw = el('div', 'swatches');
    COLORS.forEach(([n, r, g, b]) => {
      const d = el('div');
      d.title = n;
      d.style.background = cssRgb(r, g, b);
      d.onclick = () =>
        programmer.colorTargets().forEach((id) => {
          programmer.set(id, 'r', r);
          programmer.set(id, 'g', g);
          programmer.set(id, 'b', b);
        });
      sw.appendChild(d);
    });
    w2.appendChild(sw);
    w2.appendChild(el('div', 'xlabel', '&nbsp;'));
    w2.appendChild(btnGrid(2, [['Knockout Color', knock]]));
    X.appendChild(w2);
  }
  if (feat === 'beam') {
    const w = el('div');
    w.appendChild(el('div', 'xlabel', 'Beam / Shutter'));
    w.appendChild(
      btnGrid(3, [
        ['Narrow', () => applyPresetTo(5, 1)],
        ['Medium', () => applyPresetTo(5, 2)],
        ['Wide', () => applyPresetTo(5, 3)],
        ['Strobe Slow', () => encAbs('strobe', 25)],
        ['Strobe Fast', () => encAbs('strobe', 80)],
        ['Open', () => encAbs('strobe', 0)],
        ['Knockout', knock],
      ]),
    );
    X.appendChild(w);
  }
  if (feat === 'fx') {
    const w = el('div');
    w.appendChild(
      el('div', 'xlabel', 'Phaser templates — applied to the selection, ordered by selection (Phase = spread)'),
    );
    const g = el('div', 'fxGrid');
    for (const k in PHASER_TYPES) {
      const b = el('button', '', PHASER_TYPES[k].name);
      b.onclick = () => programmer.applyPhaser(k);
      g.appendChild(b);
    }
    w.appendChild(g);
    X.appendChild(w);
    const w2 = el('div');
    w2.appendChild(el('div', 'xlabel', 'Selection'));
    w2.appendChild(
      btnGrid(1, [
        ['Remove Phasers', () => programmer.removePhasers(selection.ids)],
        ['Phase 0°', () => encAbs('spread', 0)],
        ['Phase 360°', () => encAbs('spread', 360)],
        ['Phase 720°', () => encAbs('spread', 720)],
      ]),
    );
    X.appendChild(w2);
  }
}
function applyPresetTo(t, n) {
  programmer.applyPreset(t, n);
}

/* executors */
function faderDrag(elm, get, set) {
  let map = null;
  const upd = (ev) => set(clamp(1 - map(ev)[1], 0, 1));
  elm.onpointerdown = (ev) => {
    elm.setPointerCapture(ev.pointerId);
    map = boxMap(elm);
    upd(ev);
    ev.preventDefault();
  };
  elm.onpointermove = (ev) => {
    if (elm.hasPointerCapture(ev.pointerId)) upd(ev);
  };
  elm.ondblclick = () => set(get() > 0.5 ? 0 : 1);
}
// the DOM node of each executor strip, indexed like `execs`; the engine's executors hold no DOM
const execDom = [];
function buildExecs() {
  const X = $('#execs');
  X.innerHTML = '';
  execs.slice(0, 10).forEach((e, i) => {
    const d = el(
      'div',
      'ex',
      `<div class="ex-top"><span class="ex-num">${i + 1}</span><span class="ex-name"></span><button class="ex-off" title="Off">⏻</button><button class="ex-sel" title="Select">SEL</button></div>
      <div class="ex-cue"><span class="c"></span><span class="x"></span></div>
      <div class="ex-mid"><div class="fader"><div class="ff"></div><div class="cap"></div></div><div class="ex-btns"><button class="b-go">GO+</button><button class="b-back">GO−</button><button class="b-flash">FLASH</button></div></div>
      <div class="ex-lvl"></div>`,
    );
    X.appendChild(d);
    execDom[i] = d;
    const sel_ = () => {
      appState.selectExec(i);
    };
    d.querySelector('.ex-name').onclick = d.querySelector('.ex-sel').onclick = () => {
      if (appState.storeMode) {
        programmer.storeCue(i, null);
        appState.setStoreMode(false);
      }
      sel_();
    };
    d.querySelector('.ex-name').ondblclick = () =>
      openRename(`Executor ${i + 1}`, e.name, (v) => {
        e.name = v;
        showStorage.persist();
      });
    d.querySelector('.ex-off').onclick = () => {
      e.off();
      e.level = i === 0 ? e.level : 0;
    };
    d.querySelector('.b-go').onclick = () => {
      if (appState.storeMode) {
        programmer.storeCue(i, null);
        appState.setStoreMode(false);
        sel_();
        return;
      }
      sel_();
      pool.go(e, 1);
    };
    d.querySelector('.b-back').onclick = () => {
      sel_();
      pool.go(e, -1);
    };
    const fl = d.querySelector('.b-flash');
    fl.onpointerdown = () => {
      if (!e.cues.length) return;
      pool.flashPress(e);
      fl.classList.add('on');
    };
    const flUp = () => {
      if (!e.flash) return;
      pool.flashRelease(e);
      fl.classList.remove('on');
    };
    fl.onpointerup = flUp;
    fl.onpointerleave = flUp;
    faderDrag(
      d.querySelector('.fader'),
      () => e.level,
      (v) => {
        e.flashOnly = false;
        pool.setLevel(e, v);
      },
    );
  });
}
function updateExecUI() {
  execs.forEach((e, i) => {
    const d = execDom[i];
    d.classList.toggle('sel', i === appState.selExec);
    d.classList.toggle('on', e.on);
    d.querySelector('.ex-name').textContent = e.name || (e.cues.length ? `Seq ${i + 1}` : 'empty');
    const c = e.cues[e.cur],
      nx = e.cues.length ? e.cues[(e.cur + 1) % e.cues.length] : null;
    d.querySelector('.c').textContent = c ? `${c.num} ${c.name}` : e.cues.length ? `${e.cues.length} cues` : '';
    d.querySelector('.x').textContent = nx && e.on ? `› ${nx.num} ${nx.name}` : '';
    d.querySelector('.ff').style.height = e.level * 100 + '%';
    d.querySelector('.cap').style.bottom = e.level * 100 + '%';
    d.querySelector('.ex-lvl').textContent = Math.round(e.level * 100) + '%';
    d.style.setProperty('--lv', e.level);
  });
  const e = execs[appState.selExec];
  $('#mSelName').textContent = `${appState.selExec + 1} ${e.name || ''}`;
  $('#hudExec').textContent = `Exec ${appState.selExec + 1} · ${e.name || 'empty'}`;
  const c = e.cues[e.cur];
  $('#hudCue').innerHTML = c ? `<span>${c.num}</span> ${c.name}` : e.cues.length ? 'Off — press GO' : 'No cues';
  const nx = e.cues.length > 1 ? e.cues[(e.cur + 1) % e.cues.length] : null;
  $('#hudNext').textContent = nx ? `Next: ${nx.num} ${nx.name}  (fade ${nx.fade}s)` : '';
  if (autoShow.on) {
    $('#hudExec').textContent = 'AUTO SHOW · ' + autoShow.style.name;
    $('#hudCue').innerHTML = `<span>●</span> ${sectionName(autoShow.section) || ''}`;
    const nb = autoShow.barsPerLook(),
      bf = ((clock.nowSeconds() - tempo.beatOrigin) * tempo.bpm) / 240;
    $('#hudNext').textContent = `${tempo.bpm} BPM · new look every ${nb} bars`;
    $('#hudBar').style.width = ((((bf % nb) + nb) % nb) / nb) * 100 + '%';
    return;
  }
  const F = e.fade;
  $('#hudBar').style.width = F
    ? clamp((F.paused ? F.pausedAt : clock.nowSeconds() - F.t0) / (F.dur || 1), 0, 1) * 100 + '%'
    : e.on
      ? '100%'
      : '0';
  $('#pauseBtn').classList.toggle('on', !!(F && F.paused));
}
/* GM fader */
faderDrag(
  $('#gmFader'),
  () => appState.gm,
  (v) => (appState.gm = v),
);

/* sequence pane */
function renderSeq() {
  const s = $('#seqSel');
  s.innerHTML = execs
    .map(
      (e, i) =>
        `<option value="${i}" ${i === appState.selExec ? 'selected' : ''}>Exec ${i + 1} — ${e.name || 'empty'} (${e.cues.length})</option>`,
    )
    .join('');
  const e = execs[appState.selExec],
    t = $('#seqTable');
  t.innerHTML =
    `<tr><th>Cue</th><th>Name</th><th>Fade</th><th>Content</th></tr>` +
    e.cues
      .map((c, i) => {
        const nf = Object.keys(c.vals).length,
          nx = (c.fx || []).length;
        return `<tr data-i="${i}" class="${i === e.cur ? 'cur' : e.on && i === (e.cur + 1) % e.cues.length ? 'nxt' : ''}"><td class="num">${c.num}</td><td class="name">${c.name}</td><td class="fade">${c.fade}s</td><td class="info">${nf} fix${nx ? ` · ${nx} fx` : ''}</td></tr>`;
      })
      .join('');
  if (!e.cues.length)
    t.innerHTML += `<tr><td colspan="4" style="color:var(--mut);padding:14px">No cues. Build a look in the programmer, then STORE → click this executor (or type <b>Store Cue 1</b>).</td></tr>`;
  $$('#seqTable tr[data-i]').forEach((tr) => {
    const i = +tr.dataset.i,
      c = e.cues[i];
    tr.onclick = (ev) => {
      if (ev.detail > 1) return;
      if (appState.storeMode) {
        programmer.storeCue(appState.selExec, c.num, { merge: true });
        appState.setStoreMode(false);
        return;
      }
      if (!e.on && e.level === 0) e.level = 1;
      e.goto(i);
      uiDirty.all = true;
    };
    tr.querySelector('.name').ondblclick = () =>
      openRename(`Cue ${c.num}`, c.name, (v) => {
        c.name = v;
        uiDirty.all = true;
        showStorage.persist();
      });
    tr.querySelector('.fade').ondblclick = () =>
      openNumber(`Fade time for cue ${c.num} (s)`, (v) => {
        c.fade = Math.max(0, v);
        uiDirty.all = true;
        showStorage.persist();
      });
  });
}
$('#seqSel').onchange = (ev) => {
  appState.selectExec(+ev.target.value);
};
$('#seqGo').onclick = () => pool.go(execs[appState.selExec], 1);
$('#seqBack').onclick = () => pool.go(execs[appState.selExec], -1);
$('#seqDel').onclick = () => {
  const e = execs[appState.selExec];
  if (e.cur < 0) {
    toast('Goto the cue you want to delete first');
    return;
  }
  runner.run(`Delete Cue ${e.cues[e.cur].num}`);
};

/* fixture sheet */
// rows are built only when the fixture list changes; each tick writes just the cells whose text or class changed
let sheetRows = null;
function renderSheet() {
  const t = $('#sheet');
  if (!sheetRows || sheetRows.length !== fixtures.length) {
    t.innerHTML =
      `<tr><th>ID</th><th>Type</th><th>Dim</th><th>Pan</th><th>Tilt</th><th>Col</th><th>Gobo</th><th>Zoom</th></tr>` +
      fixtures
        .map(
          (f) =>
            `<tr data-id="${f.id}"><td>${f.id}</td><td style="font-family:Inter">${f.T.name}</td><td></td><td></td><td></td><td><span class="cs"></span></td><td></td><td></td></tr>`,
        )
        .join('');
    sheetRows = [...t.querySelectorAll('tr[data-id]')].map((tr) => ({
      tr,
      td: tr.cells,
      cs: tr.querySelector('.cs'),
      v: {},
    }));
  }
  fixtures.forEach((f, i) => {
    const R = sheetRows[i],
      o = f.base,
      p = programmer.vals[f.id] || {},
      c = (a) => (p[a] != null ? 'p' : ''),
      V = R.v;
    const put = (k, v, fn) => {
      if (V[k] !== v) {
        V[k] = v;
        fn(v);
      }
    };
    put('sel', selection.has(f.id) ? 'sel' : '', (v) => (R.tr.className = v));
    const cells = [
      [2, 'dim', String(Math.round(f.out.dim))],
      [3, 'pan', f.has('pan') ? String(Math.round(o.pan)) : ''],
      [4, 'tilt', f.has('tilt') ? String(Math.round(o.tilt)) : ''],
      [6, 'gobo', f.has('gobo') ? String(Math.round(o.gobo)) : ''],
      [7, 'zoom', f.has('zoom') ? (+o.zoom).toFixed(1) : ''],
    ];
    for (const [n, a, txt] of cells) {
      put('t' + n, txt, (v) => (R.td[n].textContent = v));
      put('c' + n, c(a), (v) => (R.td[n].className = v));
    }
    put('c5', c('r'), (v) => (R.td[5].className = v));
    put('sw', f.has('r') ? cssRgb(o.r, o.g, o.b) : '#333', (v) => (R.cs.style.background = v));
  });
}
$('#sheet').onclick = (ev) => {
  const tr = ev.target.closest('tr[data-id]');
  if (tr) selection.set([+tr.dataset.id], ev.shiftKey ? 'toggle' : 'replace');
};

/* keys */
$('#kStore').onclick = () => appState.setStoreMode(!appState.storeMode);
$('#kClear').onclick = () => programmer.clearPress();
$('#kHigh').onclick = () => {
  appState.highlight = !appState.highlight;
};
$('#kFan').onclick = () => {
  appState.fanMode = !appState.fanMode;
  if (feat === 'pos') renderEncExtra();
};
$('#kAll').onclick = () => selection.set(rig.lightIds());
$('#kOdd').onclick = () => selection.set(selection.ids.filter((_, i) => i % 2 === 0));
$('#kEven').onclick = () => selection.set(selection.ids.filter((_, i) => i % 2 === 1));
$('#kRev').onclick = () => {
  selection.reverse();
  log('Selection order reversed');
};
$('#goBig').onclick = () => pool.go(execs[appState.selExec], 1);
$('#goBack').onclick = () => pool.go(execs[appState.selExec], -1);
$('#pauseBtn').onclick = () => execs[appState.selExec].pause();
$('#offBtn').onclick = () => execs[appState.selExec].off();
$('#boBtn').onclick = () => {
  appState.blackout = !appState.blackout;
};
$('#tapBtn').onclick = () => tempo.tap(clock.nowMs());
$('#haze').oninput = (ev) => (appState.haze = ev.target.value / 100);
$('#house').oninput = (ev) => sceneLights.setHouseLevel(ev.target.value / 100);
let glowOn = true,
  lightsOn = true;
$('#glowBtn').onclick = (ev) => {
  glowOn = !glowOn;
  stageRenderer.setGlow(glowOn);
  ev.target.classList.toggle('on', glowOn);
};
$('#realBtn').onclick = (ev) => {
  lightsOn = !lightsOn;
  keyLights.setEnabled(lightsOn);
  stageRenderer.setShadows(lightsOn);
  ev.target.classList.toggle('on', lightsOn);
};
let showIds = false;
$('#idsBtn').onclick = (ev) => {
  showIds = !showIds;
  stageRenderer.setShowIds(showIds);
  ev.target.classList.toggle('on', showIds);
};

/* command line + keyboard */
const cmd = $('#cmd');
const hist = [];
let hi = -1;
cmd.onkeydown = (ev) => {
  if (ev.key === 'Enter') {
    const v = cmd.value;
    if (v.trim()) {
      hist.unshift(v);
      hi = -1;
    }
    if (/^\s*store\s*$/i.test(v)) {
      appState.setStoreMode(true);
      cmd.value = '';
      return;
    }
    runner.run(v);
    cmd.value = '';
    ev.preventDefault();
  } else if (ev.key === 'Escape') {
    cmd.value = '';
    cmd.blur();
    appState.setStoreMode(false);
  } else if (ev.key === 'ArrowUp') {
    hi = Math.min(hi + 1, hist.length - 1);
    if (hist[hi]) cmd.value = hist[hi];
    ev.preventDefault();
  } else if (ev.key === 'ArrowDown') {
    hi = Math.max(hi - 1, -1);
    cmd.value = hi >= 0 ? hist[hi] : '';
    ev.preventDefault();
  }
};
document.addEventListener('keydown', (ev) => {
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  if ($('#guide').classList.contains('show') || tIdx >= 0) return;
  if ($('#modal').classList.contains('show')) {
    if (ev.key === 'Escape') closeModal();
    return;
  }
  if (ev.code === 'Space') {
    ev.preventDefault();
    pool.go(execs[appState.selExec], 1);
    return;
  }
  if (ev.key === 'Escape') {
    appState.setStoreMode(false);
    return;
  }
  if (ev.key.length === 1 && !ev.ctrlKey && !ev.metaKey) {
    cmd.focus();
  }
});

/* modal helpers */
function openModal(html, rtl) {
  const b = $('#mbox');
  b.className = 'mbox' + (rtl ? ' rtl' : '');
  b.innerHTML = html;
  $('#modal').classList.add('show');
}
function closeModal() {
  $('#modal').classList.remove('show');
}
$('#modal').onclick = (ev) => {
  if (ev.target.id === 'modal') closeModal();
};
function openRename(title, val, cb) {
  openModal(
    `<h2>Label ${title}</h2><input id="mIn" style="width:100%;background:#000;color:#fff;border:1px solid #444;border-radius:4px;padding:8px;font:14px Inter" value="${(val || '').replace(/"/g, '&quot;')}"><div class="row"><button id="mOk" class="on">OK</button><button id="mCancel">Cancel</button></div>`,
  );
  const i = $('#mIn');
  i.focus();
  i.select();
  const ok = () => {
    cb(i.value.trim() || val);
    closeModal();
    uiDirty.all = true;
  };
  $('#mOk').onclick = ok;
  $('#mCancel').onclick = closeModal;
  i.onkeydown = (e) => {
    if (e.key === 'Enter') ok();
    if (e.key === 'Escape') closeModal();
  };
}
function openNumber(title, cb) {
  openModal(
    `<h2>${title}</h2><input id="mIn" type="number" step="any" style="width:100%;background:#000;color:#fff;border:1px solid #444;border-radius:4px;padding:8px;font:14px 'JetBrains Mono'"><div class="row"><button id="mOk" class="on">Set</button><button id="mCancel">Cancel</button></div>`,
  );
  const i = $('#mIn');
  i.focus();
  const ok = () => {
    const v = parseFloat(i.value);
    if (!isNaN(v)) cb(v);
    closeModal();
    uiDirty.all = true;
  };
  $('#mOk').onclick = ok;
  $('#mCancel').onclick = closeModal;
  i.onkeydown = (e) => {
    if (e.key === 'Enter') ok();
    if (e.key === 'Escape') closeModal();
  };
}
$('#helpBtn').onclick = () => openGuide(0);
document.addEventListener('click', (ev) => {
  if (ev.target.id === 'hClose') closeModal();
});

/* ====================================================================
   SHOW FILE (save / load)
==================================================================== */
const store = {
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
};
const serializer = new ShowSerializer({
  rig,
  groups: groupLibrary,
  presets: presetLibrary,
  execs,
  tempo,
  state: appState,
  programmer,
  selection,
});
const showStorage = new ShowStorage(store, () => serializer.serialize());
const demo = new DemoShow({ rig, serializer, execs, state: appState, bus });
const layoutPrefs = new LayoutPrefs(store);
const guideFlag = new GuideFlag(store);
// after any show load: the haze slider, then the pools, then a full repaint
function showLoaded() {
  $('#haze').value = appState.haze * 100;
  renderPools();
  uiDirty.all = true;
}
function loadShowFile(d) {
  serializer.load(d);
  showLoaded();
}
$('#fileBtn').onclick = () => {
  openModal(`<button class="close" id="hClose">✕</button><h2>Show File</h2>
  <p>The show auto-saves in this browser. To move it to another computer, copy the JSON and paste it there.</p>
  <div class="row"><button id="fSave" class="on">⬇ Download show file</button><button id="fCopy">Copy show JSON</button><button id="fDemo">Reload demo show</button><button id="fNew">New empty show</button></div>
  <h3>Import</h3><textarea id="fTxt" placeholder="Paste show JSON here…"></textarea>
  <div class="row"><button id="fImp" class="on">Load pasted show</button><label style="display:flex;align-items:center;gap:6px;color:var(--mut)">or file: <input type="file" id="fFile" accept=".json,application/json"></label></div>`);
  $('#fSave').onclick = () => {
    downloadBlob(
      new Blob([JSON.stringify(serializer.serialize(), null, 1)], { type: 'application/json' }),
      `luma-show-${stamp()}.json`,
    );
    toast('קובץ המופע ירד');
  };
  $('#fCopy').onclick = async () => {
    const s = JSON.stringify(serializer.serialize());
    try {
      await navigator.clipboard.writeText(s);
      toast('Show copied to clipboard');
    } catch (e) {
      $('#fTxt').value = s;
      $('#fTxt').select();
      toast('Copy blocked — JSON shown in the box, copy it manually');
    }
  };
  $('#fDemo').onclick = () => {
    demo.load();
    showLoaded();
    closeModal();
    toast('Demo show loaded');
  };
  $('#fNew').onclick = () => {
    loadShowFile({ groups: defaultGroups(rig) });
    showStorage.persist();
    closeModal();
    toast('New show');
  };
  $('#fImp').onclick = () => {
    try {
      loadShowFile(JSON.parse($('#fTxt').value));
      showStorage.persist();
      closeModal();
      toast('Show loaded');
    } catch (e) {
      toast('Invalid JSON');
    }
  };
  $('#fFile').onchange = (ev) => {
    const f = ev.target.files[0];
    if (!f) return;
    f.text().then((t) => {
      try {
        loadShowFile(JSON.parse(t));
        showStorage.persist();
        closeModal();
        toast('Show loaded');
      } catch (e) {
        toast('Invalid file');
      }
    });
  };
};

/* ====================================================================
   VIEWPORT INTERACTION (picking, box select, tooltip)
==================================================================== */
let down = null;
canvas.addEventListener('pointerdown', (ev) => {
  down = { x: ev.clientX, y: ev.clientY, shift: ev.shiftKey, box: ev.shiftKey && ev.button === 0 };
  if (down.box) {
    controls.enabled = false;
  }
});
window.addEventListener('pointermove', (ev) => {
  if (down && down.box) {
    const r = $('#viewer').getBoundingClientRect(),
      sr = $('#selRect');
    const x0 = Math.min(down.x, ev.clientX) - r.left,
      y0 = Math.min(down.y, ev.clientY) - r.top;
    sr.style.display = 'block';
    Object.assign(sr.style, {
      left: x0 + 'px',
      top: y0 + 'px',
      width: Math.abs(ev.clientX - down.x) + 'px',
      height: Math.abs(ev.clientY - down.y) + 'px',
    });
  }
});
window.addEventListener('pointerup', (ev) => {
  if (!down) return;
  const moved = Math.hypot(ev.clientX - down.x, ev.clientY - down.y);
  if (down.box && moved > 5) {
    const r = canvas.getBoundingClientRect(),
      x0 = Math.min(down.x, ev.clientX),
      x1 = Math.max(down.x, ev.clientX),
      y0 = Math.min(down.y, ev.clientY),
      y1 = Math.max(down.y, ev.clientY),
      ids = [],
      point = { x: 0, y: 0, ndcX: 0, ndcY: 0, depth: 0 };
    for (const f of fixtures) {
      projectToScreen(camera, f.pos, r, point);
      if (point.depth > 1) continue;
      if (point.x >= x0 && point.x <= x1 && point.y >= y0 && point.y <= y1) ids.push(f);
    }
    ids.sort((a, b) => a.id - b.id);
    selection.set(
      ids.map((f) => f.id),
      'add',
    );
    log(`Box select +${ids.length}`, 'ok');
  } else if (moved < 5 && ev.target === canvas) {
    const f = picker.pickAt(ev.clientX, ev.clientY);
    if (f) {
      selection.set([f.id], down.shift ? 'toggle' : 'replace');
      log(`Fixture ${f.id} (${f.T.name})`, 'ok');
    }
  }
  $('#selRect').style.display = 'none';
  controls.enabled = true;
  down = null;
});
let tipT = 0;
canvas.addEventListener('pointermove', (ev) => {
  if (down) return;
  const t = performance.now();
  if (t - tipT < 60) return;
  tipT = t;
  const f = picker.pickAt(ev.clientX, ev.clientY),
    tip = $('#tip');
  if (f) {
    const r = $('#viewer').getBoundingClientRect();
    tip.style.display = 'block';
    tip.style.left = ev.clientX - r.left + 12 + 'px';
    tip.style.top = ev.clientY - r.top + 12 + 'px';
    tip.textContent = `${f.id} · ${f.T.name}`;
    canvas.style.cursor = 'pointer';
  } else {
    tip.style.display = 'none';
    canvas.style.cursor = '';
  }
});

/* ====================================================================
   MIDI
==================================================================== */
$('#midiBtn').onclick = async () => {
  if (!navigator.requestMIDIAccess) {
    toast('Web MIDI is not available in this browser');
    return;
  }
  try {
    const acc = await navigator.requestMIDIAccess();
    const bind = () => {
      let n = 0;
      acc.inputs.forEach((inp) => {
        n++;
        inp.onmidimessage = (m) => {
          const [st, d1, d2] = m.data,
            type = st & 0xf0;
          if (type === 0xb0 && d1 >= 1 && d1 <= 10) {
            const e = execs[d1 - 1];
            pool.setLevel(e, d2 / 127);
          } else if (type === 0x90 && d2 > 0 && d1 >= 36 && d1 <= 45) pool.go(execs[d1 - 36], 1);
          else if (type === 0xb0 && d1 === 0) appState.gm = d2 / 127;
        };
      });
      return n;
    };
    const n = bind();
    acc.onstatechange = bind;
    $('#midiBtn').classList.add('on');
    toast(n ? `MIDI: ${n} input(s) connected` : 'MIDI enabled — no devices found yet');
  } catch (e) {
    toast('MIDI blocked here — open the page in its own tab in Chrome');
  }
};

/* ====================================================================
   OVERLAY (fixture IDs) + RESIZE + LOOP
==================================================================== */
// projected height of the MA console overlay (0 in the other layouts), set by fitDesk()
let maConH = 0;
stageRenderer.observeViewer();

let last = performance.now(),
  fpsAcc = 0,
  fpsN = 0,
  uiT = 0,
  slowT = 0;
function loop(t) {
  requestAnimationFrame(loop);
  const dt = Math.min((t - last) / 1000, 0.1);
  last = t;
  const now = t / 1000;
  const crowdJump = autoShow.settings.pulse === 'audio' && songPlayer.audioGraph ? 0.3 + autoShow.modulation.pump : 1;
  animateCrowd(venue.crowd, now, tempo, crowdJump);
  songPlayer.sync(tempo);
  autoShow.tick(now);
  pool.stepFades(now);
  merger.compute(now, autoShow.modulation);
  visualSync.update(now, dt, camera.position);
  props.update(now);
  sceneLights.update(lightFrame);
  keyLights.update(lightFrame);
  animatePerformers(venue.performers, now, tempo);
  stageRenderer.renderFrame();
  fpsAcc += dt;
  fpsN++;
  if (t - uiT > 50) {
    uiT = t;
    updateExecUI();
    updateEncUI();
    updateAutoUI(now);
    if (deskMode === 'ma') updateMaUI();
    $('#selInfo').innerHTML =
      `Selection: <b>${selection.ids.length}</b>${selection.ids.length ? ` <span style="color:var(--mut)">${selection.ids.length < 6 ? selection.ids.join(' ') : selection.ids[0] + '…' + selection.ids[selection.ids.length - 1]}</span>` : ''}`;
    const np = Object.keys(programmer.vals).length;
    $('#progInfo').innerHTML =
      np || programmer.fxList.length
        ? `Programmer: <b style="color:var(--prog)">${np} fix${programmer.fxList.length ? ' · ' + programmer.fxList.length + ' fx' : ''}</b>`
        : 'Programmer: empty';
    $('#kHigh').classList.toggle('on', appState.highlight);
    $('#boBtn').classList.toggle('on', appState.blackout);
    $('#kFan').classList.toggle('on', appState.fanMode);
    $('#bpmBox').textContent = tempo.bpm + ' BPM';
    $('#gmVal').textContent = Math.round(appState.gm * 100);
    $('#gmFader .ff').style.height = appState.gm * 100 + '%';
    $('#gmFader .cap').style.bottom = appState.gm * 100 + '%';
  }
  if (t - slowT > 400 || uiDirty.all) {
    slowT = t;
    if (sideTab === 'seq') renderSeq();
    if (sideTab === 'sheet') renderSheet();
    if (uiDirty.all) uiDirty.all = false;
    $('#fps').textContent = Math.round(fpsN / fpsAcc) + ' fps';
    fpsAcc = 0;
    fpsN = 0;
    const d = new Date();
    $('#clock').textContent = d.toLocaleTimeString('en-GB');
  }
}

/* ====================================================================
   AUTO SHOW — style-based look generator synced to BPM / music
==================================================================== */
const looks = new LookGenerator(rig, Math.random);
const songPlayer = new SongPlayer(clock, () => {
  $('#songPlay').textContent = '▶ Play';
});
const autoShow = new AutoShow({
  pool,
  programmer,
  tempo,
  clock,
  looks,
  bus,
  bassLevel: () => songPlayer.bassLevel(),
  onChange: () => renderAuto(),
});
/* music: load, detect BPM, play */
async function loadSong(file) {
  $('#songStat').textContent = 'Analyzing tempo…';
  try {
    const loaded = await songPlayer.load(file);
    $('#songStat').innerHTML =
      `<b style="color:var(--acc)">${loaded.name}</b> · detected <b style="color:var(--acc)">${loaded.bpm} BPM</b> · ${Math.round(loaded.duration / 60)}:${String(Math.round(loaded.duration % 60)).padStart(2, '0')}`;
    $('#songPlay').disabled = false;
    $('#aPulse').value = 'audio';
    autoShow.settings.pulse = 'audio';
  } catch (e) {
    $('#songStat').textContent = 'Could not read this audio file.';
  }
}
function toggleSong() {
  const state = songPlayer.toggle();
  if (state === 'playing') {
    $('#songPlay').textContent = '❚❚ Pause';
    if (!autoShow.on) autoShow.start();
  } else if (state === 'paused') $('#songPlay').textContent = '▶ Play';
}
/* auto UI */
function renderAuto() {
  const g = $('#styleGrid');
  g.innerHTML = '';
  for (const k in STYLES) {
    const S = STYLES[k],
      c = S.pal[0].map((n) => {
        const x = colorByName(n);
        return cssRgb(x.r, x.g, x.b);
      });
    const d = el(
      'div',
      'style' + (autoShow.settings.style === k ? ' on' : ''),
      `<div class="sb" style="background:linear-gradient(90deg,${c[0]},${c[1]})"></div><b>${S.name}</b><span dir="rtl">${he.autoStyleTaglines[k]}</span>`,
    );
    d.onclick = () => {
      autoShow.selectStyle(k);
      renderAuto();
    };
    g.appendChild(d);
  }
  const b = $('#autoGo');
  b.classList.toggle('on', autoShow.on);
  b.textContent = autoShow.on ? '■ STOP AUTO' : '▶ START AUTO';
}
function updateAutoUI(now) {
  const beatF = ((now - tempo.beatOrigin) * tempo.bpm) / 60,
    beat = ((Math.floor(beatF) % 4) + 4) % 4,
    bar = Math.floor(beatF / 4),
    nb = autoShow.barsPerLook();
  $$('#beatDots i').forEach((d, i) => d.classList.toggle('on', i === beat));
  $('#autoBpm').textContent = tempo.bpm + ' BPM';
  if (sideTab === 'auto') {
    const left = nb - (((bar % nb) + nb) % nb);
    $('#autoSec').textContent = autoShow.on
      ? `${sectionName(autoShow.section) || ''} · next look in ${left} bar${left > 1 ? 's' : ''}`
      : '';
    $('#autoStatus').innerHTML = autoShow.on
      ? `<b>● AUTO RUNNING</b> — ${autoShow.style.name}, section <b>${sectionName(autoShow.section)}</b>, fade ${autoShow.style.fade}s, change every ${nb} bars.<br>Programmer still overrides Auto, so you can grab fixtures live. Executor faders (HTP) add on top.`
      : "Pick a style and press START. Looks are generated on the bar, following the style's song sections (verse / chorus / build / drop). Use TAP or load a song to lock to the music.";
  }
}
$('#autoGo').onclick = () => (autoShow.on ? autoShow.stop() : autoShow.start());
$('#aEnergy').oninput = (ev) => {
  autoShow.settings.energy = ev.target.value / 100;
  $('#aEnergyV').textContent = ev.target.value;
};
$('#aEnergy').onchange = () => {
  if (autoShow.on) autoShow.newLook();
};
$('#aMaster').oninput = (ev) => {
  autoShow.settings.master = ev.target.value / 100;
  $('#aMasterV').textContent = ev.target.value;
};
$('#aBars').onchange = (ev) => (autoShow.settings.bars = +ev.target.value);
$('#aPulse').onchange = (ev) => (autoShow.settings.pulse = ev.target.value);
$('#aStrobe').onchange = (ev) => (autoShow.settings.strobes = ev.target.checked);
$('#aHits').onchange = (ev) => (autoShow.settings.hits = ev.target.checked);
$('#aScreen').onchange = (ev) => (autoShow.settings.screen = ev.target.checked);
$('#aTake').onchange = (ev) => (autoShow.settings.take = ev.target.checked);
$('#songFile').onchange = (ev) => {
  const f = ev.target.files[0];
  if (f) loadSong(f);
};
$('#songPlay').onclick = toggleSong;
$('#aNext').onclick = () => {
  if (!autoShow.on) autoShow.start();
  else autoShow.newLook();
};
$('#aSave').onclick = () => {
  if (!autoShow.on || !autoExec.cues[0]) {
    toast('Start Auto first');
    return;
  }
  const e = execs[appState.selExec],
    num = e.cues.length ? Math.floor(e.cues[e.cues.length - 1].num) + 1 : 1;
  e.cues.push(savedLookCue(autoExec.cues[0], num, autoShow.style));
  if (!e.name) e.name = `Seq ${appState.selExec + 1}`;
  e.invalidate();
  showStorage.persist();
  uiDirty.all = true;
  toast(`Look saved as Cue ${num} in Exec ${appState.selExec + 1}`);
  log(`Auto look → Exec ${appState.selExec + 1} Cue ${num}`, 'ok');
};
$('#aList').onclick = () => {
  const S = autoShow.style;
  let ei = execs.findIndex((e, i) => i > 0 && !e.cues.length);
  if (ei < 0) {
    toast('No empty executor — clear one first');
    return;
  }
  const cues = buildLookList(looks, S, autoShow.settings);
  const e = execs[ei];
  e.name = S.name;
  e.cues = cues;
  e.resetTracking();
  appState.selectExec(ei);
  showStorage.persist();
  toast(`8-cue ${S.name} list built in Exec ${ei + 1}`);
  log(`Built ${S.name} cue list → Exec ${ei + 1}`, 'ok');
};

/* ====================================================================
   USER GUIDE (Hebrew) + GUIDED TOUR
==================================================================== */
const K = (k) => `<kbd>${k}</kbd>`,
  CD = (c) => `<code>${c}</code>`;
const RIG_TABLE = [
  ['101–120', 'Spot', 'טראס קדמי (FOH)'],
  ['201–230', 'Beam', 'טראס 2'],
  ['301–330', 'Wash', 'טראס 3'],
  ['401–420', 'Spot', 'טראס 4'],
  ['501–530', 'Beam', 'טראס אחורי'],
  ['601–624', 'Wash', 'מגדלי צד (טורים)'],
  ['701–740', 'Beam', 'רצפה, ירכתי הבמה'],
  ['801–816', 'Blinder', 'טראס קדמי, לקהל'],
  ['901–920', 'Strobe', 'טראס 3'],
  ['1001–1016', 'Wash', 'רצפה, קדמת הבמה'],
  ['1101–1120', 'LED Par', 'רצפה, מתחת למסך'],
  ['1201–1224', 'Beam', 'הטבעת החיצונית (עיגול)'],
  ['1301–1312', 'Wash', 'הטבעת הפנימית'],
  ['1401–1424', 'Beam', 'תרסות זוויתיות'],
  ['1501–1512', 'Spot', 'תרסות זוויתיות (אמצעיות)'],
  ['1601–1610', 'Beam', 'ראש עמודי התאורה על הבמה'],
  ['1701–1710', 'Wash', 'אמצע עמודי התאורה'],
  ['1801–1812', 'Wash', 'תאורת קהל, טראס קדמי'],
  ['1813–1818', 'Wash', 'מגדלי דיליי בקהל'],
  ['1901–1904', 'Follow Spot', 'טראס קדמי, בין הספוטים; עמדת RoboSpot ב־FOH'],
  ['2101–2112', 'LED Bar', 'רצפה, קדמת הבמה (Tilt בלבד)'],
  ['2201–2212', 'Profile', 'סולמות הצד, קבועים'],
  ['2001', 'LED Screen', 'מסך LED (ומסכי הצד)'],
];
const GUIDE = [
  {
    t: 'התחלה מהירה',
    h: () => `
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
  <div class="tipbox"><b>טיפ:</b> לחץ על <b>סיור מודרך</b> בתפריט הימני. הוא מראה על המסך איפה נמצא כל דבר.</div>`,
  },
  {
    t: 'המסך',
    h: () => `
  <table><tr><th>אזור</th><th>מה יש בו</th></tr>
  <tr><td>שורה עליונה</td><td>זוויות מצלמה, <b>House</b> (אורות קהל), <b>Haze</b> (עשן), <b>Glow</b>, <b>Real light</b> (אור אמיתי וצללים), <b>Fixture IDs</b> (מספרי גופים על הבמה), MIDI, Show File והמדריך.</td></tr>
  <tr><td>הבמה (מרכז)</td><td>תצוגת התלת־ממד. למעלה משמאל: כמה גופים נבחרים ומה יש בפרוגרמר. למטה משמאל: ה־Cue הנוכחי והבא באקזקיוטר הנבחר.</td></tr>
  <tr><td>פאנל המסכים</td><td><b>Pools</b> (קבוצות ו־Presets), <b>Auto Show</b>, <b>Sequence</b> (רשימת ה־Cues), <b>Fixture Sheet</b> (טבלת ערכים של כל הגופים). ב־Classic זה הפאנל הימני וב־Desk זה SCREEN משמאל, עם ארבעה טאבים. ב־Console (MA) ה־Pools תמיד במסך 2, והשלושה האחרים הם טאבים במסך 1.</td></tr>
  <tr><td>שורת אנקודרים</td><td>טאבים לפי תכונה: Dimmer, Position, Gobo, Color, Beam, Phaser. אנקודרים וכלים ייעודיים לכל טאב. נקודה אדומה ליד טאב = יש ערכים בפרוגרמר.</td></tr>
  <tr><td>פריסה (Layout)</td><td>ברירת המחדל היא <b>Console (MA)</b>: קונסולה פיזית גדולה בסגנון grandMA שעומדת לפני הבמה, בעמדת התאורה בתוך הקהל. זווית FOH מראה את הבמה מגובה העיניים של המפעיל. הידית בקצה העליון של המסגרת של המסכים משנה את גודל הקונסולה בגרירה, ודאבל־קליק מחזיר לגודל האוטומטי. למעלה 2 מסכים גדולים: מסך 1 עם Fixture Sheet, Sequence ו־Auto Show ושורת הפקודה, ומסך 2 עם ה־Pools (קבוצות ו־Presets) וכלי הפרוגרמר. במשטח משמאל: מסך LCD רחב מעל 4 פיידרים מיוחדים בכיפות זהב (HOUSE, HAZE, ENERGY, AUTO MSTR) ו־10 אקזקיוטרים עם מקשים. מימין: מקשי תכונות, 5 אנקודרים, 2 מסכי מגע קטנים (צבע ומיקום), מקלדת, GO, פיידר GM וגלגל LEVEL לעוצמת הבחירה. <b>Desk</b>: הבמה לכל הרוחב, ומתחתיה קונסולה אחת קומפקטית במרכז, כמו שולחן אמיתי. משמאל SCREEN (Pools, Auto, Sequence), באמצע PROGRAMMER ו־PLAYBACK, מימין COMMAND עם מקלדת מספרים ו־MASTER. ב־Desk הבורר שליד Layout מגדיל או מקטין את הקונסולה (Auto מתאים אותה לרוחב המסך). <b>Classic</b> מחזיר לפריסה הקודמת.</td></tr>
  <tr><td>שולחן (למטה)</td><td>שורת פקודה ומקשים (STORE, CLEAR…), 10 אקזקיוטרים עם פיידרים, ובצד ימין של השולחן: GO הגדול, GO−, PAUSE, B.O., TAP, OFF ופיידר GM. זה נכון בכל שלוש הפריסות.</td></tr></table>
  <h3>שליטה במצלמה</h3><ul><li>גרירה עם הכפתור השמאלי: סיבוב סביב הבמה.</li><li>גרירה עם הכפתור הימני: הזזה.</li><li>גלגלת: זום.</li><li>כפתורי זווית למעלה מחזירים לנקודות קבועות.</li></ul>`,
  },
  {
    t: 'בחירת גופים',
    h: () => `
  <h3>בבמה</h3><ul><li>לחיצה על גוף: בוחר רק אותו. ${K('Shift')}+לחיצה: מוסיף או מוריד מהבחירה.</li><li>${K('Shift')}+גרירה: בחירה מלבנית, מוסיפה את כל הגופים שבתוך המלבן.</li><li>מעבר עם העכבר מעל גוף מציג את המספר והסוג שלו.</li><li>הכפתור <b>Fixture IDs</b> מציג מספר מעל כל גוף.</li></ul>
  <h3>Groups</h3><p>לחיצה על קבוצה ב־Pools בוחרת אותה. ${K('Shift')}+לחיצה מוסיפה לבחירה. דאבל־קליק משנה שם. סדר הבחירה חשוב לאפקטים ולפריסה (FAN, Phase).</p>
  <h3>בשורת הפקודה</h3><ul><li>${CD('Fixture 201 Thru 230')} או בקיצור ${CD('201 Thru 230')}</li><li>${CD('Group 24 + Group 31')} מוסיף. ${CD('Group 13 - Fixture 701 Thru 710')} מוריד.</li><li>${CD('All')} בוחר הכול.</li></ul>
  <h3>מקשי בחירה</h3><ul><li><b>ALL</b>: הכול. <b>ODD</b> / <b>EVEN</b>: משאיר כל גוף שני מהבחירה. <b>REVERSE</b>: הופך את סדר הבחירה (משנה כיוון של צ'ייסים ו־FAN).</li></ul>`,
  },
  {
    t: 'פרוגרמר וערכים',
    h: () => `
  <p>הפרוגרמר הוא "שולחן העבודה": כל ערך שאתה משנה נכנס אליו ומסומן <b style="color:var(--prog)">באדום</b>. הפרוגרמר תמיד גובר על כל מה שרץ באקזקיוטרים ובאוטו, עד שמנקים אותו.</p>
  <h3>אנקודרים</h3><ul><li>גרירה למעלה ולמטה על הכפתור העגול. ${K('Shift')} = תנועה עדינה.</li><li>גלגלת העכבר מעל הכפתור.</li><li>דאבל־קליק על המספר מתחתיו: הקלדת ערך מדויק.</li></ul>
  <h3>הטאבים</h3><table>
  <tr><td>Dimmer</td><td>עוצמה. כפתורי Full / 75 / 50 / 25 / 10 / Zero.</td></tr>
  <tr><td>Position</td><td>Pan / Tilt. <b>Focus pad</b>: מפת במה, לחיצה וגרירה מכוונות את כל הבחירה לנקודה. הסליידר Aim height קובע את גובה הנקודה. Home מחזיר לישר.</td></tr>
  <tr><td>Gobo</td><td>8 גובואים וסיבוב. במסך ה־LED (גוף 2001) הטאב הזה בוחר את תוכן המסך: Solid, Gradient, Bars, Plasma, Pulse, Grid, Waves, Sparkle.</td></tr>
  <tr><td>Color</td><td>בוחר צבע (לחיצה וגרירה), 16 ריבועי צבע מוכנים, ואנקודרים לאדום, ירוק וכחול.</td></tr>
  <tr><td>Beam</td><td>Zoom (Narrow, Medium, Wide) ו־Shutter לסטרוב.</td></tr>
  <tr><td>Phaser</td><td>אפקטים, ואנקודרים ל־Rate, Size ו־Phase. ראה בפרק הבא.</td></tr></table>
  <h3>כלים</h3><ul><li><b>FAN</b>: כשהוא דולק, סיבוב אנקודר פורש את הערך סימטרית על הבחירה, ממינוס בקצה אחד לפלוס בקצה השני. מעולה למניפות.</li><li><b>HIGHLT</b>: הבחירה בלבן מלא, לפוקוס. לחיצה שנייה מכבה.</li><li><b>Knockout</b> בכל טאב: מוציא מהפרוגרמר רק את התכונה הזו לגופים הנבחרים.</li><li><b>CLEAR</b>: לחיצה ראשונה מנקה בחירה, שנייה מנקה את הפרוגרמר, דאבל־קליק מהיר מנקה הכול.</li></ul>`,
  },
  {
    t: 'Presets ו־Phasers',
    h: () => `
  <h3>Presets</h3><p>ב־Pools בחר טאב (1 Dimmer, 2 Position, 3 Gobo, 4 Color, 5 Beam) ולחץ על Preset. הוא מוחל על הבחירה ונכנס לפרוגרמר.</p>
  <p>ה־Position Presets מחושבים לכל גוף לפי המיקום שלו בריג, ולכן אותו Preset עובד על כל קבוצה:</p>
  <table><tr><td>Center / Singer / Drums / Band / Orchestra</td><td>פוקוס על הבמה ועל הנגנים.</td></tr><tr><td>Audience / Fan Audience / Crowd</td><td>לתוך הקהל, מאירים את האנשים.</td></tr>
  <tr><td>Sky Fan / V Out / Tunnel / Cross</td><td>מניפות לשמיים, V החוצה, מנהרה, הצלבה.</td></tr><tr><td>Ring Down / Cone / Sunburst / Twist / Crown</td><td>עיצובים לעיגול: עמודים, חרוט, קרני שמש, טורנדו, כתר. עובדים גם על קבוצות אחרות.</td></tr>
  <tr><td>Converge / Wing Fan</td><td>התכנסות לנקודה מעל הקהל, ומניפה רחבה.</td></tr></table>
  <p>Preset משלך: בנה ערכים בפרוגרמר, לחץ <b>STORE</b> ואז על משבצת ריקה ב־Presets, או הקלד ${CD('Store Preset 4.20')}. דאבל־קליק על Preset משנה שם.</p>
  <h3>Phasers (אפקטים)</h3><ol><li>בחר גופים. הסדר קובע את כיוון האפקט.</li><li>בטאב <b>Phaser</b> לחץ על אפקט: Circle, Pan Sweep, Tilt Bounce, Ballyhoo, Dim Wave, Dim Chase, Swipe, Random Flash, Rainbow, Color Chase.</li><li>כוונן באנקודרים: <b>Rate</b> (מהירות יחסית ל־BPM), <b>Size</b> (גודל), <b>Phase</b> (פריסה בין הגופים: 0° כולם יחד, 360° גל אחד, 720° שני גלים).</li></ol>
  <div class="tipbox"><b>TAP</b> בשולחן: הקש בקצב השיר 4 פעמים, וכל האפקטים מסתנכרנים ל־BPM.</div>`,
  },
  {
    t: 'הקלטת Cues',
    h: () => `
  <ol class="steps"><li>בנה לוק בפרוגרמר: בחירה, ערכים, Presets ו־Phasers.</li><li>לחץ <b>STORE</b>. הוא מהבהב באדום, והמשבצות שאפשר להקליט אליהן מסומנות.</li>
  <li>לחץ על <b>שם האקזקיוטר</b> או על ה־<b>GO+</b> שלו. ה־Cue נוסף לסוף הרשימה. מקש ${K('Esc')} מבטל את ה־STORE.</li><li>לחץ <b>CLEAR</b> פעמיים ובנה את ה־Cue הבא.</li></ol>
  <h3>בשורת הפקודה</h3><table><tr><td>${CD('Store Cue 5')}</td><td>שומר Cue מספר 5 באקזקיוטר הנבחר. אם כבר קיים, הוא מוחלף.</td></tr><tr><td>${CD('Store Cue 5 Fade 3')}</td><td>עם פייד של 3 שניות.</td></tr><tr><td>${CD('Store Cue 2 Exec 4')}</td><td>לאקזקיוטר 4.</td></tr><tr><td>${CD('Label Cue 5 Chorus')}</td><td>שם ל־Cue.</td></tr><tr><td>${CD('Delete Cue 4')}</td><td>מחיקה.</td></tr></table>
  <h3>עריכה בטאב Sequence</h3><ul><li>לחיצה על Cue: קפיצה אליו (Goto).</li><li>דאבל־קליק על השם או על הפייד: עריכה.</li><li><b>STORE</b> ואז לחיצה על Cue קיים: <b>ממזג</b> את הפרוגרמר לתוכו (Update).</li></ul>
  <h3>Tracking: חשוב להבין</h3><p>כל Cue שומר רק את מה שהיה בפרוגרמר. ערכים שלא שינית ממשיכים מה־Cue הקודם. אם ב־Cue 3 כיבית רק את הבימים, כל השאר נשאר דולק כמו ב־Cue 2. כדי לכבות משהו ב־Cue, צריך להקליט אותו עם Dimmer 0.</p>
  <div class="tipbox"><b>קיצור:</b> ב־Auto Show, הכפתור <b>Save look → cue</b> מקליט את הלוק האוטומטי הנוכחי כ־Cue, ו־<b>Build cue list</b> בונה רשימה של 8 Cues בסגנון.</div>`,
  },
  {
    t: 'פלייבק והפעלה',
    h: () => `
  <table><tr><td>פיידר</td><td>מעל 0 מדליק את האקזקיוטר, ב־0 מכבה. דאבל־קליק על הפיידר: 0 או 100.</td></tr><tr><td>GO+ / GO−</td><td>ה־Cue הבא או הקודם. בסוף הרשימה חוזר להתחלה.</td></tr>
  <tr><td>FLASH</td><td>מומנטרי: דולק במלואו כל עוד מחזיקים.</td></tr><tr><td>OFF</td><td>מכבה את האקזקיוטר.</td></tr><tr><td>לחיצה על שם</td><td>בוחרת את האקזקיוטר ל־GO הגדול, לרווח ול־Sequence.</td></tr>
  <tr><td>GO הגדול / ${K('רווח')}</td><td>GO+ על האקזקיוטר הנבחר.</td></tr><tr><td>PAUSE</td><td>עוצר פייד באמצע. GO ממשיך אותו.</td></tr><tr><td>B.O.</td><td>בלאקאאוט מלא.</td></tr><tr><td>GM</td><td>Grand Master: עוצמה כללית לכל המערכת.</td></tr></table>
  <h3>איך אקזקיוטרים מתערבבים</h3><ul><li><b>Dimmer לפי HTP</b>: הגבוה מנצח. העוצמה של כל אקזקיוטר מוכפלת בפיידר שלו.</li><li><b>שאר התכונות לפי LTP</b>: מה שהופעל אחרון מנצח.</li><li>הפרוגרמר מעל הכול.</li></ul>
  <h3>אקזקיוטרים בדמו</h3><p>1 Main Show (10 Cues), 2 Blinders, 3 Strobes, 4 Floor Chase, 5 Swipe T2, 6 Red Alert, 7 Key Light (פוקוס לזמר), 8 Screen Sparkle, 9 Ring FX (5 לוקים לעיגול), 10 Wings. נסה FLASH על 2 ו־3 תוך כדי שה־Main Show רץ.</p>`,
  },
  {
    t: 'Auto Show',
    h: () => `
  <ol class="steps"><li>פתח את הטאב <b>Auto Show</b> בפאנל הימני.</li><li>בחר סגנון: EDM, Techno, Rock, Pop, Hip-Hop, Mizrahi/Party, Ballad, Orchestral, Cinematic.</li><li>לחץ <b>▶ START AUTO</b>. לוקים חדשים נוצרים על הבר לפי מבנה של שיר: Verse, Chorus, Build ו־Drop.</li></ol>
  <table><tr><td>Energy</td><td>עוצמה וכמות הגופים שעובדים.</td></tr><tr><td>Auto master</td><td>פיידר ייעודי לאוטו.</td></tr><tr><td>Change every</td><td>כל כמה ברים מתחלף לוק.</td></tr><tr><td>Pulse</td><td>הבימים פועמים לביט (Beat) או לפי המוזיקה (Audio).</td></tr><tr><td>תיבות סימון</td><td>סטרובים בדרופ, בלינדרים בפזמון, המסך, השתלטות על אקזקיוטרים.</td></tr><tr><td>Next look now</td><td>לוק חדש מיד.</td></tr></table>
  <h3>עם מוזיקה</h3><p>טען קובץ mp3 או wav בתיבה <b>Music</b>. ה־BPM מזוהה אוטומטית. לחץ <b>▶ Play</b> והכול ננעל על השיר, כולל הקהל שקופץ. בלי שיר, הקש <b>TAP</b> בקצב.</p>
  <div class="tipbox">אפשר לתפוס גופים בזמן שהאוטו רץ: כל מה שבפרוגרמר גובר עליו. אחר כך <b>CLEAR</b> פעמיים מחזיר את השליטה לאוטו.</div>`,
  },
  {
    t: 'שורת פקודה',
    h: () => `
  <p>מקלידים בכל מקום, והטקסט נכנס אוטומטית לשורת הפקודה. ${K('Enter')} מבצע, ${K('↑')} / ${K('↓')} מחזירים פקודות קודמות, ${K('Esc')} מבטל. אותיות גדולות או קטנות לא משנות.</p>
  <table><tr><th>פקודה</th><th>מה היא עושה</th></tr>
  <tr><td>${CD('Fixture 101 Thru 120')}</td><td>בחירת טווח. אפשר גם בלי המילה Fixture.</td></tr><tr><td>${CD('Group 3 + Group 9')}</td><td>חיבור קבוצות.</td></tr><tr><td>${CD('Group 13 - 701 Thru 720')}</td><td>הורדה מהבחירה.</td></tr>
  <tr><td>${CD('At 75')} · ${CD('@ 75')} · ${CD('Full')} · ${CD('Zero')}</td><td>Dimmer לבחירה.</td></tr><tr><td>${CD('Group 2 At Full')}</td><td>בחירה ועוצמה בפקודה אחת.</td></tr>
  <tr><td>${CD('Preset 4.10')}</td><td>Preset מספר 10 מסוג Color.</td></tr><tr><td>${CD('Store Cue 5 Fade 2')}</td><td>הקלטה.</td></tr><tr><td>${CD('Store Group 40')} · ${CD('Store Preset 2.30')}</td><td>שמירת קבוצה או Preset.</td></tr>
  <tr><td>${CD('Label Cue 5 Drop')} · ${CD('Label Group 40 Front')} · ${CD('Label Exec 4 Solo')}</td><td>שמות.</td></tr><tr><td>${CD('Exec 3')}</td><td>בחירת אקזקיוטר.</td></tr>
  <tr><td>${CD('Go')} · ${CD('Go-')} · ${CD('Go Exec 2')}</td><td>הפעלה.</td></tr><tr><td>${CD('Goto Cue 4')}</td><td>קפיצה ל־Cue.</td></tr><tr><td>${CD('Off')} · ${CD('Off Exec 2')}</td><td>כיבוי.</td></tr>
  <tr><td>${CD('Fade 3')}</td><td>זמן פייד ל־Cue הנוכחי.</td></tr><tr><td>${CD('Delete Cue 4')}</td><td>מחיקה.</td></tr><tr><td>${CD('Clear')} · ${CD('ClearAll')}</td><td>ניקוי.</td></tr><tr><td>${CD('Highlight')} · ${CD('Blackout')}</td><td>הפעלה וכיבוי.</td></tr></table>`,
  },
  {
    t: 'קיצורים',
    h: () => `
  <table><tr><td>${K('רווח')}</td><td>GO+ על האקזקיוטר הנבחר.</td></tr><tr><td>הקלדת אות או מספר</td><td>פותחת את שורת הפקודה.</td></tr><tr><td>${K('F')}</td><td>מסך מלא.</td></tr><tr><td>${K('Esc')}</td><td>ביטול STORE, יציאה משורת הפקודה וסגירת חלונות.</td></tr>
  <tr><td>${K('Shift')}+לחיצה בבמה</td><td>הוספה או הורדה מהבחירה.</td></tr><tr><td>${K('Shift')}+גרירה בבמה</td><td>בחירה מלבנית.</td></tr><tr><td>${K('Shift')}+גרירת אנקודר</td><td>כוונון עדין.</td></tr>
  <tr><td>דאבל־קליק</td><td>על ערך: הקלדה. על Group, Preset, Cue או אקזקיוטר: שינוי שם. על פיידר: 0 או 100.</td></tr></table>
  <h3>MIDI</h3><p>לחץ <b>MIDI</b> ואשר. CC 1–10 שולטים בפיידרים 1–10, CC 0 ב־GM, ו־Notes 36–45 הם GO לאקזקיוטרים 1–10. ייתכן שהדפדפן יחסום MIDI בתוך העמוד הזה.</p>`,
  },
  {
    t: 'הריג והקבוצות',
    h: () => `
  <p>405 גופים בבריכת הסולטן. מספרי הגופים לפי מיקום:</p>
  <table><tr><th>מספרים</th><th>סוג</th><th>מיקום</th></tr>${RIG_TABLE.map((r) => `<tr><td><code>${r[0]}</code></td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</table>
  <h3>קבוצות מוכנות</h3><table>${Object.entries(defaultGroups(rig))
    .map(
      ([n, g]) =>
        `<tr><td><code>Group ${n}</code></td><td>${g.name}</td><td style="color:var(--mut)">${g.ids.length} גופים</td></tr>`,
    )
    .join('')}</table>`,
  },
  {
    t: 'שמירה וביצועים',
    h: () => `
  <h3>שמירת המופע</h3><ul><li>המופע נשמר אוטומטית בדפדפן הזה: Cues, קבוצות ו־Presets.</li><li><b>Show File</b> ← <b>Download show file</b> מוריד את כל המופע כקובץ ‎.json. במחשב אחר: Show File ← טעינה מקובץ, או הדבקה ב־<b>Load pasted show</b>.</li><li><b>Reload demo show</b> מחזיר את הדמו. <b>New empty show</b> פותח מופע ריק עם הקבוצות.</li></ul>
  <div class="warnbox">ניקוי היסטוריית הדפדפן מוחק את המופע השמור. כדאי לגבות ב־Download show file.</div>
  <h3>הקלטת וידאו של המופע</h3><p>לחץ <b>● REC</b> בשורה העליונה. ההקלטה מתחילה (הכפתור מהבהב באדום), ולחיצה נוספת עוצרת ומורידה קובץ וידאו ‎.webm של תצוגת הבמה, כולל השיר אם טענת אחד ב־Auto Show. כדאי לבחור קודם זווית מצלמה ולהעלות את המסך למצב מלא (⛶ או ${K('F')}).</p><h3>התקנה כאפליקציה</h3><p>ב־Chrome או Edge במחשב: לחץ <b>⬇ התקן אפליקציה</b> למעלה (או על סמל ההתקנה בשורת הכתובת). ב־iPad/iPhone: שיתוף ← <b>הוסף למסך הבית</b>. אחרי ההתקנה האפליקציה נפתחת בחלון משלה ועובדת גם בלי אינטרנט.</p>
  <h3>אם יש האטה</h3><ol><li>כבה <b>Real light</b> (אור אמיתי וצללים).</li><li>כבה <b>Glow</b>.</li><li>הקטן את חלון הדפדפן.</li><li>השתמש ב־Chrome או ב־Edge במחשב עם כרטיס מסך.</li></ol>
  <h3>אם לא רואים</h3><ul><li>האלומות חזקות מדי ולא רואים את הנגנים: הורד <b>Haze</b>.</li><li>הקהל חשוך: הרם <b>House</b> או הפעל את הקבוצה 33 Audience Washes.</li><li>שום דבר לא מגיב: בדוק ש־<b>B.O.</b> כבוי וש־<b>GM</b> למעלה.</li><li>משהו "תקוע" ולא משתנה: הפרוגרמר גובר. לחץ <b>CLEAR</b> פעמיים.</li></ul>`,
  },
];
let gIdx = 0;
function renderGuide() {
  $('#gNav').innerHTML =
    `<div class="gt"><i></i>מדריך LUMA DESK</div>` +
    GUIDE.map((c, i) => `<button data-i="${i}" class="${i === gIdx ? 'on' : ''}"><b>${i + 1}</b>${c.t}</button>`).join(
      '',
    ) +
    `<button class="tourBtn" id="gTour">▶ סיור מודרך במסך</button>`;
  $('#gTitle').textContent = `${gIdx + 1}. ${GUIDE[gIdx].t}`;
  $('#gBody').innerHTML = GUIDE[gIdx].h();
  $('#gBody').scrollTop = 0;
  $('#gPrev').style.visibility = gIdx ? 'visible' : 'hidden';
  $('#gNext').style.visibility = gIdx < GUIDE.length - 1 ? 'visible' : 'hidden';
  $$('#gNav button[data-i]').forEach(
    (b) =>
      (b.onclick = () => {
        gIdx = +b.dataset.i;
        renderGuide();
      }),
  );
  $('#gTour').onclick = () => {
    closeGuide();
    startTour();
  };
}
function openGuide(i) {
  if (i != null) gIdx = i;
  renderGuide();
  $('#guide').classList.add('show');
}
function closeGuide() {
  $('#guide').classList.remove('show');
  guideFlag.markSeen();
}
$('#gClose').onclick = closeGuide;
$('#gPrev').onclick = () => {
  gIdx--;
  renderGuide();
};
$('#gNext').onclick = () => {
  gIdx++;
  renderGuide();
};
$('#guide').onclick = (ev) => {
  if (ev.target.id === 'guide') closeGuide();
};
const sideTo = (t) => {
    if (t !== 'pools' || deskMode !== 'ma') $(`#sideTabs [data-t=${t}]`).click();
  },
  featTo = (f) => $(`#featTabs [data-f=${f}]`).click();
const TOUR = [
  [
    '#viewer',
    'הבמה',
    'תצוגת התלת־ממד של בריכת הסולטן. לחיצה על גוף בוחרת אותו, Shift+גרירה בוחרת במלבן. גרירה מסובבת את המצלמה, גלגלת עושה זום.',
  ],
  [
    '#top .tbg',
    'זוויות מצלמה',
    'נקודות מבט מוכנות: FOH, Front, On Stage, Top, Band, Orchestra, Ring, Wide, Audience, Drums, Old City.',
  ],
  ['#house', 'אורות קהל (House)', 'מעלה ומוריד את תאורת הקהל, כדי לראות את האנשים גם כשהבמה חשוכה.'],
  ['#haze', 'עשן (Haze)', 'כמה רואים את האלומות באוויר. להוריד כשרוצים לראות את הנגנים והפרטים.'],
  [
    '#groupPool',
    'Groups',
    'קבוצות גופים מוכנות. לחיצה בוחרת, Shift+לחיצה מוסיפה. 24 = העיגול, 31 = עמודי הבמה, 33 = תאורת קהל.',
    () => sideTo('pools'),
  ],
  [
    '#presetPool',
    'Presets',
    'בוחרים סוג (Dimmer, Position, Gobo, Color, Beam) ולוחצים על Preset כדי להחיל אותו על הבחירה. Position Presets מחושבים לכל גוף.',
    () => sideTo('pools'),
  ],
  [
    '#featTabs',
    'טאבי תכונות',
    'בוחרים מה מכוונים: Dimmer, Position, Gobo, Color, Beam או Phaser. נקודה אדומה = יש ערכים בפרוגרמר.',
    () => featTo('pos'),
  ],
  [
    '#encoders',
    'אנקודרים',
    'גוררים למעלה או למטה לשינוי ערך (Shift = עדין), או דאבל־קליק על המספר כדי להקליד. אדום = ערך בפרוגרמר.',
  ],
  [
    '#encExtra',
    'כלים לכל טאב',
    () =>
      deskMode === 'ma'
        ? 'כאן הכלים של הטאב הנבחר: ב־Position יש Aim height, Home, Knockout ו־Fan, ובטאב Phaser יש אפקטים. ה־Focus pad ובוחר הצבע נמצאים בשני מסכי המגע הקטנים שמתחת לאנקודרים: לוחצים על המפה וכל הבחירה מכוונת לשם.'
        : 'כאן, ב־Position, יש Focus pad: לוחצים על מפת הבמה וכל הבחירה מכוונת לשם. בטאב Color יש בוחר צבע, ובטאב Phaser יש אפקטים.',
  ],
  [
    '.cmdrow',
    'שורת פקודה',
    'פקודות בסגנון MA: Group 2 At Full, Store Cue 5, Goto Cue 3. מספיק להתחיל להקליד מכל מקום.',
  ],
  [
    '#kStore',
    'STORE',
    'הקלטה: לוחצים STORE ואז על שם אקזקיוטר (Cue חדש), על Cue ב־Sequence (עדכון) או על משבצת ריקה ב־Pools.',
  ],
  ['#kClear', 'CLEAR', 'לחיצה ראשונה מנקה בחירה, שנייה מנקה את הפרוגרמר, דאבל־קליק מנקה הכול.'],
  [
    '#execs',
    'אקזקיוטרים',
    '10 פלייבקים. פיידר מדליק, GO+ ו־GO− מריצים Cues, FLASH מומנטרי. לחיצה על השם בוחרת את האקזקיוטר.',
  ],
  ['#goBig', 'GO', 'ה־Cue הבא באקזקיוטר הנבחר. מקש הרווח עושה את אותו הדבר.'],
  ['#gmFader', 'Grand Master', 'עוצמה כללית לכל המערכת. ליד יש B.O. (בלאקאאוט) ו־TAP לקצב.'],
  [
    '#sideTabs [data-t=auto]',
    'Auto Show',
    'מופע אוטומטי בסגנונות (EDM, רוק, מזרחית, תזמורתי…), אפשר מסונכרן לשיר שתטען.',
    () => sideTo('auto'),
  ],
  [
    '#helpBtn',
    'המדריך',
    'המדריך המלא תמיד זמין כאן. בהצלחה בהופעה!',
    () => sideTo(deskMode === 'ma' ? 'sheet' : 'pools'),
  ],
];
let tIdx = -1;
function startTour() {
  tIdx = 0;
  showTour();
}
function endTour() {
  tIdx = -1;
  $('#tourHole').style.display = $('#tourTip').style.display = 'none';
}
function showTour() {
  const [sel, title, txt, before] = TOUR[tIdx],
    text = typeof txt === 'function' ? txt() : txt;
  if (before) before();
  requestAnimationFrame(() => {
    const e = $(sel);
    if (!e) {
      endTour();
      return;
    }
    let r = e.getBoundingClientRect();
    const pad = 6,
      H = $('#tourHole'),
      T = $('#tourTip');
    // a target inside a scrolling pane (the pools on MA screen 2) is scrolled into the pane; the hole keeps to the visible part
    const sp = e.parentElement.closest('.pane');
    if (sp && sp.scrollHeight > sp.clientHeight) {
      let s = sp.getBoundingClientRect();
      if (r.top < s.top || r.bottom > s.bottom) {
        sp.scrollTop += ((r.top - s.top) * sp.offsetHeight) / s.height - 4;
        r = e.getBoundingClientRect();
        s = sp.getBoundingClientRect();
      }
      const L = Math.max(r.left, s.left),
        Tp = Math.max(r.top, s.top),
        R = Math.min(r.right, s.right),
        B = Math.min(r.bottom, s.bottom);
      r = { left: L, top: Tp, right: R, bottom: B, width: R - L, height: B - Tp };
    }
    Object.assign(H.style, {
      display: 'block',
      left: r.left - pad + 'px',
      top: r.top - pad + 'px',
      width: r.width + pad * 2 + 'px',
      height: r.height + pad * 2 + 'px',
    });
    $('#tTitle').textContent = title;
    $('#tText').textContent = text;
    $('#tCount').textContent = `${tIdx + 1} / ${TOUR.length}`;
    $('#tPrev').style.visibility = tIdx ? 'visible' : 'hidden';
    $('#tNext').style.display = tIdx < TOUR.length - 1 ? '' : 'none';
    T.style.display = 'block';
    const tw = 340,
      th = T.offsetHeight,
      vw = innerWidth,
      vh = innerHeight;
    let top = r.bottom + 14;
    if (top + th > vh - 8) top = r.top - th - 14;
    if (top < 8) top = clamp(r.top + 14, 8, vh - th - 8);
    let left = r.left + r.width / 2 - tw / 2;
    if (r.width > vw * 0.6) left = r.left + 20;
    T.style.left = clamp(left, 8, vw - tw - 8) + 'px';
    T.style.top = top + 'px';
  });
}
$('#tNext').onclick = () => {
  tIdx++;
  showTour();
};
$('#tPrev').onclick = () => {
  tIdx--;
  showTour();
};
$('#tEnd').onclick = endTour;
addEventListener('resize', () => {
  if (tIdx >= 0) showTour();
});
document.addEventListener(
  'keydown',
  (ev) => {
    if (ev.key === 'Escape') {
      if (tIdx >= 0) endTour();
      if ($('#guide').classList.contains('show')) closeGuide();
    }
  },
  true,
);

/* ====================================================================
   APP FEATURES: file download, video recording, fullscreen, install, offline
==================================================================== */
const stamp = () => {
  const d = new Date(),
    z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}-${z(d.getHours())}${z(d.getMinutes())}`;
};
function downloadBlob(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 2000);
}
const rec = { mr: null, chunks: [], t0: 0, dest: null };
$('#recBtn').onclick = () => {
  if (rec.mr) {
    rec.mr.stop();
    return;
  }
  if (!canvas.captureStream || !window.MediaRecorder) {
    toast('הדפדפן הזה לא תומך בהקלטת וידאו — נסה Chrome');
    return;
  }
  const stream = canvas.captureStream(30);
  const songGraph = songPlayer.audioGraph;
  if (songGraph) {
    if (!rec.dest) {
      rec.dest = songGraph.context.createMediaStreamDestination();
      songGraph.node.connect(rec.dest);
    }
    rec.dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
  }
  const mime =
    ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'].find((m) =>
      MediaRecorder.isTypeSupported(m),
    ) || '';
  try {
    rec.mr = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12e6 });
  } catch (e) {
    toast('לא ניתן להתחיל הקלטה');
    return;
  }
  rec.chunks = [];
  rec.t0 = performance.now();
  rec.mr.ondataavailable = (e) => {
    if (e.data.size) rec.chunks.push(e.data);
  };
  rec.mr.onstop = () => {
    const type = rec.mr.mimeType || 'video/webm';
    downloadBlob(new Blob(rec.chunks, { type }), `luma-desk-${stamp()}.${type.includes('mp4') ? 'mp4' : 'webm'}`);
    rec.mr = null;
    $('#recBtn').classList.remove('on');
    $('#recBtn').textContent = '● REC';
    toast('הווידאו נשמר להורדות');
  };
  rec.mr.start(1000);
  $('#recBtn').classList.add('on');
  toast('מקליט… לחץ שוב על REC לעצירה');
};
setInterval(() => {
  if (rec.mr) {
    const s_ = Math.floor((performance.now() - rec.t0) / 1000);
    $('#recBtn').textContent = `■ ${Math.floor(s_ / 60)}:${String(s_ % 60).padStart(2, '0')}`;
  }
}, 500);
const toggleFs = () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.().catch(() => toast('מסך מלא לא זמין'));
};
$('#fsBtn').onclick = toggleFs;
document.addEventListener(
  'keydown',
  (ev) => {
    const tag = document.activeElement?.tagName;
    if (
      (ev.key === 'f' || ev.key === 'F') &&
      !ev.ctrlKey &&
      !ev.metaKey &&
      tag !== 'INPUT' &&
      tag !== 'TEXTAREA' &&
      !$('#guide').classList.contains('show')
    ) {
      ev.preventDefault();
      ev.stopImmediatePropagation();
      toggleFs();
    }
  },
  true,
);
let installEvt = null;
addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installEvt = e;
  $('#installBtn').style.display = '';
});
$('#installBtn').onclick = async () => {
  if (!installEvt) return;
  installEvt.prompt();
  await installEvt.userChoice;
  installEvt = null;
  $('#installBtn').style.display = 'none';
};
addEventListener('appinstalled', () => {
  $('#installBtn').style.display = 'none';
  toast('LUMA DESK הותקנה');
});
if ('serviceWorker' in navigator && location.protocol.startsWith('http'))
  navigator.serviceWorker.register('sw.js').catch(() => {});

/* ====================================================================
   DESK LAYOUT — moves the control sections into one compact console under the stage
==================================================================== */
let keypad = null;
function buildKeypad() {
  keypad = el('div', 'keypad');
  const K_ = [
    ['Fixture', 'w'],
    ['Group', 'w'],
    ['Preset', 'w'],
    ['Cue', 'w'],
    ['Exec', 'w'],
    ['⌫', 'bk'],
    ['7', 'n'],
    ['8', 'n'],
    ['9', 'n'],
    ['Thru', 'w'],
    ['At', 'w'],
    ['Full', 'w'],
    ['4', 'n'],
    ['5', 'n'],
    ['6', 'n'],
    ['+', 'w'],
    ['Goto', 'w'],
    ['Zero', 'w'],
    ['1', 'n'],
    ['2', 'n'],
    ['3', 'n'],
    ['-', 'w'],
    ['Fade', 'w'],
    ['Label', 'w'],
    ['0', 'n'],
    ['.', 'n'],
    ['Delete', 'w'],
    ['ENTER', 'en'],
  ];
  for (const [t, c] of K_) {
    const b = el('button', c, t);
    b.onclick = () => kpPress(t);
    keypad.appendChild(b);
  }
}
function kpPress(t) {
  const v = cmd.value;
  if (t === 'ENTER') {
    if (v.trim()) {
      hist.unshift(v);
      if (/^\s*store\s*$/i.test(v)) {
        appState.setStoreMode(true);
        cmd.value = '';
        return;
      }
      runner.run(v);
    }
    cmd.value = '';
    return;
  }
  if (t === '⌫') {
    const w = v.trimEnd();
    cmd.value = /[0-9.]$/.test(w) ? w.slice(0, -1) : w.replace(/\S+$/, '').trimEnd() + (w.includes(' ') ? ' ' : '');
    if (!cmd.value.trim()) cmd.value = '';
    return;
  }
  if (/^[0-9.]$/.test(t)) {
    cmd.value = (/[0-9.]$/.test(v) ? v : v && !v.endsWith(' ') ? v + ' ' : v) + t;
    return;
  }
  cmd.value = (v && !v.endsWith(' ') ? v + ' ' : v) + t + ' ';
}
// maSize: the console's share of the height, set with the grip; undefined = the adaptive default of fitDesk()
const MA_SIZE = 0.47;
let deskMode = 'ma',
  deskZoom = 'auto',
  maForcedTab = null,
  maSize,
  maGeo = null;
const saveLayout = () => layoutPrefs.save({ deskMode, deskZoom, maSize });
const PARTS = {
  featTabs: $('#featTabs'),
  encBody: $('#encBody'),
  encoders: $('#encoders'),
  encExtra: $('#encExtra'),
  cmdFb: $('#cmdFb'),
  cmdrow: $('.cmdrow'),
  keys: $('.keys'),
};
function restoreParts() {
  const P = PARTS;
  P.encBody.append(P.encoders, P.encExtra);
  $('#enc').append(P.featTabs, P.encBody);
  $('#cmdArea').prepend(P.cmdFb, P.cmdrow, P.keys);
  $('#sideTabs').after($('#pane-pools'));
}
function applyLayout() {
  const wasMa = document.body.classList.contains('ma');
  restoreParts();
  const desk = deskMode === 'desk',
    ma = deskMode === 'ma';
  document.body.classList.toggle('desk', desk);
  document.body.classList.toggle('ma', ma);
  if (ma) {
    if (!keypad) buildKeypad();
    $('#d1s').appendChild($('#side'));
    $('#d2s').append($('#pane-pools'), PARTS.encExtra);
    $('#d3s').append(PARTS.cmdFb, PARTS.cmdrow);
    $('#pbSlot').appendChild($('#execs'));
    $('#execs').style.flex = '1';
    $('#ftSlot').appendChild(PARTS.featTabs);
    $('#ecSlot').appendChild(PARTS.encoders);
    $('#kySlot').appendChild(PARTS.keys);
    $('#kpSlot').appendChild(keypad);
    $('#msSlot').appendChild($('#master'));
    // Pools is always on screen 2 here, so screen 1 needs one of the remaining tabs; leaving MA gives Pools back
    if (sideTab === 'pools') {
      sideTo('sheet');
      maForcedTab = 'sheet';
    }
  } else if (desk) {
    $('#cwScreen').appendChild($('#side'));
    $('#encSlot').appendChild($('#enc'));
    $('#execSlot').appendChild($('#execs'));
    $('#execs').style.flex = '1';
    const cw = $('#cwCmd');
    cw.appendChild($('#cmdArea'));
    if (!keypad) buildKeypad();
    $('#cmdArea').appendChild(keypad);
    $('#cwMaster').appendChild($('#master'));
  } else {
    $('#main').appendChild($('#side'));
    $('#app').insertBefore($('#enc'), $('#desk'));
    $('#desk').insertBefore($('#cmdArea'), $('#desk').firstChild);
    if (keypad) keypad.remove();
    $('#desk').insertBefore($('#execs'), $('#master') && $('#master').parentNode === $('#desk') ? $('#master') : null);
    $('#execs').style.flex = '';
    $('#desk').appendChild($('#master'));
  }
  if (!ma && maForcedTab) {
    if (sideTab === maForcedTab) sideTo('pools');
    maForcedTab = null;
  }
  maGeo = null;
  renderEncoders();
  fitDesk();
  stageRenderer.resize();
  if (views.currentView === 'foh' && wasMa !== ma) setView('foh', true);
  saveLayout();
}
function fitDesk() {
  const z = deskZoom === 'auto' ? clamp((innerWidth - 24) / 1880, 0.66, 1.05) : +deskZoom;
  $('#cbody').style.setProperty('--dz', z.toFixed(3));
  const mb = $('#maBody');
  if (deskMode !== 'ma') {
    maConH = 0;
    stageRenderer.setConsoleHeight(maConH);
    mb.style.setProperty(
      '--mz',
      (deskZoom === 'auto' ? clamp((innerWidth - 24) / 1920, 0.55, 1.05) : +deskZoom).toFixed(3),
    );
    return;
  }
  // the projected console (union of its planes) is measured once per layout at zoom 1; it does not depend on the window
  if (!maGeo || !maGeo.W) {
    for (const [k, v] of [
      ['--mz', '1'],
      ['--mt', '0px'],
      ['--mb', '0px'],
    ])
      mb.style.setProperty(k, v);
    const D = mb.getBoundingClientRect();
    let L = 1e9,
      T = 1e9,
      R = -1e9,
      B = -1e9;
    for (const e of mb.querySelectorAll('.maScreens,.maDeck,.maFront,.maCheek')) {
      const r = e.getBoundingClientRect();
      L = Math.min(L, r.left);
      T = Math.min(T, r.top);
      R = Math.max(R, r.right);
      B = Math.max(B, r.bottom);
    }
    maGeo = { W: R - L, H: B - T, mt: D.top - T, mb: B - D.bottom };
  }
  // fit by projected width and by a share of the height under the top bar; without a grip size the share is MA_SIZE,
  // raised (up to .66) in small windows until the zoom reaches .6 so the legends stay readable
  const hz = (innerHeight - 40) / maGeo.H,
    share = maSize ?? clamp(0.6 / hz, MA_SIZE, 0.66);
  const zm = clamp(Math.min(1.1, (innerWidth * 0.98) / maGeo.W, share * hz), 0.2, 1.5);
  mb.style.setProperty('--mt', maGeo.mt.toFixed(1) + 'px');
  mb.style.setProperty('--mb', maGeo.mb.toFixed(1) + 'px');
  mb.style.setProperty('--mz', zm.toFixed(3));
  maConH = maGeo.H * zm;
  stageRenderer.setConsoleHeight(maConH);
  const C = $('#maConsole').style;
  C.setProperty('--ch', maConH.toFixed(0) + 'px');
  C.setProperty('--cw', (maGeo.W * zm).toFixed(0) + 'px');
  $('#viewer').style.setProperty('--ch', maConH.toFixed(0) + 'px');
}
/* MA console hardware: special master faders, touch screens and level wheel */
const SPECS = [
  ['house', 'HOUSE'],
  ['haze', 'HAZE'],
  ['aEnergy', 'ENERGY'],
  ['aMaster', 'AUTO'],
];
SPECS.forEach(([id, name], i) => {
  const inp = $('#' + id),
    lo = +inp.min,
    hi = +inp.max;
  const d = el(
    'div',
    'spc',
    `<span class="sk">S${i + 1}</span><span class="sn">${name}</span><span class="sv"></span><span class="sl"></span><div class="fader"><div class="ff"></div><div class="cap"></div></div>`,
  );
  $('#maSpecs').appendChild(d);
  const fd = d.querySelector('.fader');
  faderDrag(
    fd,
    () => (inp.value - lo) / (hi - lo),
    (v) => {
      inp.value = lo + v * (hi - lo);
      inp.dispatchEvent(new Event('input'));
    },
  );
  // the original sliders also act on 'change' (Energy starts a new auto look on release): send it only for a real change
  let v0 = inp.value,
    vc = inp.value;
  const send = () => {
    vc = inp.value;
    inp.dispatchEvent(new Event('change'));
  };
  d.addEventListener('pointerdown', () => (v0 = inp.value), true);
  fd.addEventListener('lostpointercapture', () => {
    if (inp.value !== v0) send();
  });
  fd.addEventListener('dblclick', () => {
    if (inp.value !== vc) send();
  });
});
colorPad($('#tsCol'));
const tsPosDraw = focusPad($('#tsPos'));
let tsPosKey = null;
const curVal = (f, a) => programmer.vals[f.id]?.[a] ?? f.base[a];
function updateMaUI() {
  $$('#maSpecs .spc').forEach((d, i) => {
    const inp = $('#' + SPECS[i][0]),
      k = (inp.value - inp.min) / (inp.max - inp.min);
    d.style.setProperty('--lv', k);
    d.querySelector('.sv').textContent = inp.value;
    d.querySelector('.ff').style.height = k * 100 + '%';
    d.querySelector('.cap').style.bottom = k * 100 + '%';
  });
  const fs = selection.ids.map((id) => FX[id]),
    fc = fs.find((f) => f.has('r')),
    mk = $('#tsColMk');
  if (fc) {
    const r = curVal(fc, 'r'),
      g = curVal(fc, 'g'),
      b = curVal(fc, 'b'),
      mx = Math.max(r, g, b),
      dl = mx - Math.min(r, g, b);
    // kept inline: core rgb2hsv changes the last digits of style.left (177k of 1.03M inputs); Phase 5 decides
    const h = !dl ? 0 : mx === r ? ((g - b) / dl + 6) % 6 : mx === g ? (b - r) / dl + 2 : (r - g) / dl + 4;
    Object.assign(mk.style, {
      display: 'block',
      left: (h / 6) * 100 + '%',
      top: (1 - (mx ? dl / mx : 0)) * 100 + '%',
      background: cssRgb(r, g, b),
    });
    $('#tsColInfo').textContent = `R${Math.round(r)} G${Math.round(g)} B${Math.round(b)}`;
  } else {
    mk.style.display = 'none';
    $('#tsColInfo').textContent = '';
  }
  $('#tsColNone').style.display = fc ? 'none' : '';
  $('#tsColNone').textContent = selection.ids.length
    ? 'NO COLOR IN SELECTION'
    : 'NO SELECTION · PICKS GO TO LIT FIXTURES';
  const k = selection.ids.join();
  if (k !== tsPosKey) {
    tsPosKey = k;
    tsPosDraw();
  }
  const fp = fs.find((f) => f.has('pan'));
  $('#tsPosInfo').textContent = fp
    ? `PAN ${Math.round(curVal(fp, 'pan'))}° TILT ${Math.round(curVal(fp, 'tilt'))}°`
    : '';
  $('#tsPosNone').style.display = selection.ids.length ? 'none' : '';
  const fd = fs.find((f) => f.has('dim'));
  $('#lvlVal').textContent = fd ? Math.round(curVal(fd, 'dim')) : '—';
}
{
  const w = $('#lvlWheel');
  let lastY = 0,
    acc = 0,
    map = null;
  const turn = (d, fine) => {
    acc -= d;
    w.style.backgroundPositionY = acc + 'px';
    encDelta('dim', ((d * 100) / 320) * (fine ? 0.1 : 1));
  };
  w.onpointerdown = (ev) => {
    w.setPointerCapture(ev.pointerId);
    map = boxMap(w);
    lastY = map(ev)[1] * map.h;
    ev.preventDefault();
  };
  w.onpointermove = (ev) => {
    if (!w.hasPointerCapture(ev.pointerId)) return;
    const y = map(ev)[1] * map.h,
      dy = lastY - y;
    lastY = y;
    turn(dy, ev.shiftKey);
  };
  w.onwheel = (ev) => {
    ev.preventDefault();
    turn(-Math.sign(ev.deltaY) * 3.2, ev.shiftKey);
  };
}
$('#layoutSel').onchange = (ev) => {
  deskMode = ev.target.value;
  applyLayout();
};
$('#deskZoom').onchange = (ev) => {
  deskZoom = ev.target.value;
  fitDesk();
  stageRenderer.resize();
  saveLayout();
};
{
  const g = $('#maGrip');
  let raf = 0;
  const apply = () => {
    raf = 0;
    fitDesk();
    stageRenderer.resize();
  };
  g.onpointerdown = (ev) => {
    g.setPointerCapture(ev.pointerId);
    g.classList.add('on');
    ev.preventDefault();
    ev.stopPropagation();
  };
  g.onpointermove = (ev) => {
    if (!g.hasPointerCapture(ev.pointerId)) return;
    maSize = clamp((innerHeight - ev.clientY) / (innerHeight - 40), 0.3, 0.7);
    if (!raf) raf = requestAnimationFrame(apply);
  };
  g.onlostpointercapture = () => {
    g.classList.remove('on');
    saveLayout();
  };
  g.ondblclick = () => {
    maSize = undefined;
    fitDesk();
    stageRenderer.resize();
    saveLayout();
  };
}
addEventListener('resize', () => {
  if (deskMode !== 'classic') fitDesk();
});
// the panes on the console screens are scrolled here: Chromium does not scroll them by wheel inside the 3D console;
// 20px steps (just under one 21px sheet row) keep the Fixture Sheet's row snapping moving forward with fine (touchpad) deltas
{
  let acc = 0;
  $('#maBody').addEventListener(
    'wheel',
    (ev) => {
      let p = ev.defaultPrevented ? null : ev.target.closest('#groupPool,.pane,#encExtra');
      // at the end of the groups list the wheel goes on to the pane around it
      if (
        p &&
        p.id === 'groupPool' &&
        (ev.deltaY > 0 ? p.scrollTop + p.clientHeight >= p.scrollHeight - 1 : p.scrollTop <= 0)
      )
        p = p.closest('.pane');
      if (!p || p.scrollHeight <= p.clientHeight) return;
      ev.preventDefault();
      acc += ev.deltaMode ? ev.deltaY * 20 : ev.deltaY;
      const n = Math.trunc(acc / 20);
      if (n) {
        acc -= n * 20;
        p.scrollBy({ top: n * 20 });
      }
    },
    { passive: false },
  );
}
// clear key clears a half-typed command line first (like MA); STORE pre-types "Store"
{
  const kc = $('#kClear');
  const old = kc.onclick;
  kc.onclick = () => {
    if (cmd.value.trim()) {
      cmd.value = '';
      return;
    }
    old();
  };
}
setInterval(() => {
  if (deskMode === 'ma') {
    const e = execs[appState.selExec],
      F = FEATS.find((f) => f[0] === feat);
    $('#d1info').textContent = (sideTab || '').toUpperCase();
    $('#d2info').textContent = `${F ? F[1].toUpperCase() : ''} · ${selection.ids.length} SEL`;
    $('#d3info').textContent = `EXEC ${appState.selExec + 1} ${e.name || ''}`;
    return;
  }
  if (deskMode !== 'desk') return;
  const e = execs[appState.selExec];
  $('#cwPbInfo').textContent = `EXEC ${appState.selExec + 1} · ${e.name || 'empty'}`;
  $('#cwProgInfo').textContent = `${selection.ids.length} SELECTED`;
  $('#cwScreenInfo').textContent = (sideTab || '').toUpperCase();
}, 250);
const savedLayout = layoutPrefs.load(MA_SIZE);
if (savedLayout) ({ deskMode, deskZoom, maSize } = savedLayout);
$('#layoutSel').value = deskMode;
$('#deskZoom').value = deskZoom;
applyLayout();

/* engine -> UI: the engine reports through the bus; until Phase 5 these subscribers are the UI side */
bus.on('message', (m) => (m.kind === 'log' ? log(m.text, m.level) : toast(m.text)));
bus.on('poolsChanged', () => renderPools());
bus.on('showChanged', () => showStorage.persist());
bus.on('stateDirty', () => (uiDirty.all = true));
bus.on('storeModeChanged', ({ on }) => {
  $('#kStore').classList.toggle('on', on);
  document.body.classList.toggle('storing', on);
});
/* boot */
renderFeatTabs();
renderEncoders();
buildExecs();
renderAuto();
restoreShow({ storage: showStorage, serializer, execs, demo, repaint: showLoaded });
if (!guideFlag.seen()) setTimeout(() => openGuide(0), 600);
requestAnimationFrame(loop);
window.__desk = {
  renderer,
  THREE,
  perf: venue.performers,
  prog: programmer,
  applyPreset: (type, slot) => programmer.applyPreset(type, slot),
  runCmd: (raw) => runner.run(raw),
  execs,
  setView,
  FX,
  sel: () => selection.ids,
  execGo: (e, dir) => pool.go(e, dir),
  gotoCue: (e, i, fadeOverride) => e.goto(i, fadeOverride),
  scene,
  camera,
  controls,
  fixtures,
  groups: () => groupLibrary.all,
};
// TEST HOOK (see the "?test" block in <head>): read-only views and drivers for the Playwright suite; absent without "?test"
if (window.__deskClock) {
  const C = window.__deskClock,
    fbLog = new MutationObserver(() => {}),
    toastLog = new MutationObserver(() => {});
  fbLog.observe($('#cmdFb'), { childList: true });
  toastLog.observe($('#toast'), { childList: true, characterData: true, subtree: true });
  const state = () => {
    const show = serializer.serialize();
    return jsonClone({
      sel: selection.ids,
      prog: programmer.vals,
      progFx: programmer.fxList,
      selExec: appState.selExec,
      highlight: appState.highlight,
      blackout: appState.blackout,
      deskMode,
      execs: execs.map((e) => ({
        name: e.name,
        cur: e.cur,
        on: e.on,
        level: e.level,
        cues: e.cues.map((c) => [c.num, c.name, c.fade]),
      })),
      groups: show.groups,
      presets: show.presets,
    });
  };
  window.__desk.test = {
    ...C,
    state,
    serialize: () => jsonClone(serializer.serialize()),
    // move to an absolute time (seconds, never backwards) and return the output of every fixture there
    outputAt: (sec) => {
      if (sec * 1000 > C.now()) C.advance(sec * 1000 - C.now());
      const now = C.now() / 1000;
      pool.stepFades(now);
      merger.compute(now, autoShow.modulation);
      return fixtures.map((f) => ({ id: f.id, ...f.out }));
    },
    // run one command line and return the log lines it wrote, the toast it showed (null if none) and the state after it
    run: (line) => {
      fbLog.takeRecords();
      toastLog.takeRecords();
      runner.run(line);
      const added = fbLog.takeRecords().flatMap((m) => [...m.addedNodes]);
      const toast = toastLog.takeRecords().length ? $('#toast').textContent : null;
      return { line, log: added.map((n) => [n.firstChild?.className || '', n.textContent]), toast, state: state() };
    },
    // start a programmer phaser on the selection, as the phaser buttons do
    applyFx: (type) => programmer.applyPhaser(type),
  };
}
