import { vi } from 'vitest';
import { wireEngine } from '../../../../src/app/boot/wireEngine';
import type { DeskTestApi } from '../../../../src/app/testHook/installTestHook';
import { installTestHook } from '../../../../src/app/testHook/installTestHook';
import type { DeskStageApi } from '../../../../src/app/testHook/stageHooks';
import { CameraViews } from '../../../../src/render/camera/CameraViews';
import { ShowSerializer } from '../../../../src/show';
import { FakeDom } from '../../../shared/dom';
import { fakeCanvas } from '../../render/fakeCanvas';

/** Stands in for MutationObserver: the test queues the records the next takeRecords() returns. */
export class FakeObserver {
  static readonly all: FakeObserver[] = [];
  records: { addedNodes: object[] }[] = [];
  constructor() {
    FakeObserver.all.push(this);
  }
  observe(): void {}
  takeRecords(): { addedNodes: object[] }[] {
    return this.records.splice(0);
  }
}

type DeskPage = { test: DeskTestApi; fixtures: unknown; setView: unknown; renderMemory: () => unknown } & DeskStageApi;

/**
 * The hook over a real engine and serializer, on a fake page whose window holds `clock` (or no clock at all). The
 * caller unstubs the globals after each test.
 */
export function installOnFakePage(clock?: object) {
  const engine = wireEngine();
  const { groupLibrary: groups, presetLibrary: presets, pool, tempo, appState: state, programmer, selection } = engine;
  const [rig, execs] = [engine.stage.rig, pool.execs];
  const serializer = new ShowSerializer({ rig, groups, presets, execs, tempo, state, programmer, selection });
  const dom = new FakeDom();
  dom.add('cmdFb');
  dom.add('toast');
  FakeObserver.all.length = 0;
  vi.stubGlobal('MutationObserver', FakeObserver);
  // the frame stats wrap requestAnimationFrame, so the fake page has one
  const requestAnimationFrame = vi.fn();
  const page: { __deskClock?: object; __desk?: DeskPage; requestAnimationFrame: () => void } = clock
    ? { __deskClock: clock, requestAnimationFrame }
    : { requestAnimationFrame };
  vi.stubGlobal('window', page);
  const setView = vi.fn();
  const autoShow = { modulation: { pump: 1, hitUntil: 0 } };
  const render = { frame: 0, calls: 0, triangles: 0, points: 0, lines: 0 };
  const info = { memory: { geometries: 3, textures: 1 }, render, programs: null, autoReset: true };
  // no frame runs in a unit test, so nothing asks for the GL context
  const renderer = {
    info,
    getContext: (): never => {
      throw new Error('no WebGL in a unit test');
    },
  };
  const mvrReady = vi.fn(() => Promise.resolve());
  const mvrScenery = (): boolean => false;
  installTestHook({
    ...engine,
    setView,
    views: new CameraViews(fakeCanvas(), { isMaLayout: () => false, onViewChanged: () => undefined }),
    execs,
    serializer,
    deskMode: () => 'desk',
    autoShow,
    renderer,
    mvrReady,
    mvrScenery,
    mvrPostChain: () => false,
    mvrBodies: () => Promise.resolve([]),
    fixtureVisuals: { visuals: [] },
    mvrScene: { traverse: () => undefined },
  });
  return { engine, dom, page, setView, mvrReady };
}

/** A `?test` clock the hook accepts, starting at 10 s. */
export const fakeClock = () => {
  let t = 10000;
  return { now: () => t, advance: (ms: number) => (t += ms), frames: async () => {}, randomCalls: () => 0 };
};
