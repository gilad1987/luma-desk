/**
 * The composition root: builds the desk in the order of the original page script. The order is parity. three.js
 * draws each object's uuid from the seeded Math.random (decision 24), every panel appends its markup where the one
 * before it ended, and window and document listeners fire in registration order. Areas built later are reached
 * through closures that run only after boot (the layout mode, the guide).
 */
import { wireEngine } from './app/boot/wireEngine';
import { wireRender } from './app/boot/wireRender';
import { wireAppFeatures } from './app/io/wireAppFeatures';
import { wireGuide } from './app/io/wireGuide';
import { wireMidi } from './app/io/wireMidi';
import { wireLayout } from './app/layout/wireLayout';
import { FrameLoop } from './app/loop/FrameLoop';
import { scheduleUiTicks } from './app/loop/scheduleUiTicks';
import { UiTickScheduler } from './app/loop/UiTickScheduler';
import { installTestHook } from './app/testHook/installTestHook';
import { FpsClock } from './app/ui/FpsClock';
import { wirePanels } from './app/ui/wirePanels';
import { createAutoShow } from './app/uix/createAutoShow';
import { createShowFiles } from './app/uix/createShowFiles';
import { restoreShow } from './show';
import { byId } from './ui/dom';
import { appShellMarkup } from './ui/layouts/appShellMarkup';
import { viewerMarkup } from './ui/layouts/viewerMarkup';
import { ViewportPicking } from './ui/panels/viewport/ViewportPicking';

// the side column and the desk footer start empty: their panels render into them
document.body.insertAdjacentHTML('afterbegin', appShellMarkup({ viewer: viewerMarkup, side: '', desk: '' }));

const engine = wireEngine();
const { stage, bus, pool } = engine;
const { execs } = pool;
const render = wireRender(engine);
const files = createShowFiles({ ...engine, execs });
const auto = createAutoShow(engine);

const panels = wirePanels({
  engine,
  render,
  files,
  auto,
  layoutMode: () => layout.mode(),
  guideOrTourOpen: () => guide.isOpen() || tour.isActive(),
});
// the picking meshes are the boot rig's until the render rebuilds them on a stage change
new ViewportPicking({ ...engine, ...render, fixtures: stage.rig.fixtures });
wireMidi(engine);
render.stageRenderer.observeViewer();

const { guide, tour } = wireGuide({
  stage,
  sideTabs: panels.sideTabs,
  isMa: () => layout.mode() === 'ma',
  guideFlag: files.guideFlag,
});
byId('helpBtn').onclick = () => guide.open(0);
wireAppFeatures({ ...engine, canvas: render.canvas, songPlayer: auto.songPlayer, guide });

const layout = wireLayout({
  ...engine,
  ...render,
  ...panels,
  execs,
  storeMode: panels.store,
  layoutPrefs: files.layoutPrefs,
});
layout.restore();

const fps = new FpsClock();
const ui = new UiTickScheduler();
scheduleUiTicks(ui, { ...panels, layout, fps });
bus.on('stateDirty', () => ui.markDirty());

panels.autoShowPanel.renderStyles();
restoreShow({ ...files, storage: files.showStorage, execs, repaint: panels.showLoaded });
guide.openOnFirstRun();
new FrameLoop({ ...engine, ...render, ...auto, fps, ui }).start();
installTestHook({
  ...engine,
  ...files,
  setView: render.setView,
  execs,
  autoShow: auto.autoShow,
  deskMode: () => layout.mode(),
});
