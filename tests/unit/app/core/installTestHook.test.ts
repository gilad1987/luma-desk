import { afterEach, describe, expect, it, vi } from 'vitest';
import { wireEngine } from '../../../../src/app/boot/wireEngine';
import { installTestHook, type DeskTestApi } from '../../../../src/app/testHook/installTestHook';
import { BUILT_IN_DESIGN } from '../../../../src/domain/stage/templates/sultansPool/builtInDesign';
import { ShowSerializer } from '../../../../src/show';
import { FakeDom, FakeElement } from '../../../shared/dom';

afterEach(() => vi.unstubAllGlobals());

/** Stands in for MutationObserver: the test queues the records the next takeRecords() returns. */
class FakeObserver {
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

/** The hook over a real engine and serializer, on a fake page whose window holds `clock` (or no clock at all). */
function install(clock?: object) {
  const engine = wireEngine();
  const { rig, groupLibrary: groups, presetLibrary: presets, pool, tempo, appState: state, programmer } = engine;
  const execs = pool.execs;
  const selection = engine.selection;
  const serializer = new ShowSerializer({ rig, groups, presets, execs, tempo, state, programmer, selection });
  const dom = new FakeDom();
  dom.add('cmdFb');
  dom.add('toast');
  FakeObserver.all.length = 0;
  vi.stubGlobal('MutationObserver', FakeObserver);
  const page: { __deskClock?: object; __desk?: { test: DeskTestApi; fixtures: unknown; setView: unknown } } = {};
  if (clock) page.__deskClock = clock;
  vi.stubGlobal('window', page);
  const setView = vi.fn();
  const deps = { ...engine, fixtures: rig.fixtures, setView, execs: pool.execs, serializer };
  const mvr = { mvrStage: { design: BUILT_IN_DESIGN, rig }, mvrReady: vi.fn(() => Promise.resolve()) };
  installTestHook({ ...deps, ...mvr, deskMode: () => 'desk', autoShow: { modulation: { pump: 1, hitUntil: 0 } } });
  return { engine, dom, page, setView, mvrReady: mvr.mvrReady };
}

const fakeClock = () => {
  let t = 10000;
  return { now: () => t, advance: (ms: number) => (t += ms), frames: async () => {}, randomCalls: () => 0 };
};

describe('installTestHook', () => {
  it('publishes nothing on a page without the ?test clock (decision 23)', () => {
    expect(install().page.__desk).toBeUndefined();
  });

  it('keeps exactly the fields the specs read', () => {
    const { page, engine, setView } = install(fakeClock());
    expect(Object.keys(page.__desk ?? {})).toEqual(['setView', 'fixtures', 'test']);
    expect(page.__desk?.fixtures).toBe(engine.rig.fixtures);
    expect(page.__desk?.setView).toBe(setView);
  });

  it('moves the clock forward only in outputAt and returns every fixture output with its id', () => {
    const { page, engine } = install(fakeClock());
    const test = page.__desk?.test;
    const out = test?.outputAt(12);
    expect(test?.now()).toBe(12000);
    test?.outputAt(5);
    expect(test?.now()).toBe(12000);
    expect(out?.map((o) => o.id)).toEqual(engine.rig.fixtures.map((f) => f.id));
  });

  it('runs a command and returns its log lines with the span class, no toast, and the state after it', () => {
    const { page, engine } = install(fakeClock());
    const feedback = FakeObserver.all[0];
    // what the command line panel appends to #cmdFb: <div><span class="level">text</span></div>
    engine.bus.on('message', (m) => {
      const span = Object.assign(new FakeElement('span'), { className: m.kind === 'log' ? m.level : '' });
      feedback?.records.push({ addedNodes: [{ firstChild: span, textContent: m.text }] });
    });
    const result = page.__desk?.test.run('Store Exec 20');
    expect(result?.line).toBe('Store Exec 20');
    expect(result?.log).toEqual([['er', 'No such executor']]);
    expect(result?.toast).toBeNull();
    const keys = Object.keys(result?.state ?? {}).join(' ');
    expect(keys).toBe('sel prog progFx selExec highlight blackout deskMode execs groups presets');
  });

  it('passes mvrReady through and reads mvrStage() live from the MVR stage', async () => {
    const { page, engine, mvrReady } = install(fakeClock());
    expect(page.__desk?.test.mvrStage().fixtureCount).toBe(engine.rig.fixtures.length);
    await page.__desk?.test.mvrReady();
    expect(mvrReady).toHaveBeenCalledOnce();
  });

  it('rejects an unknown phaser type instead of starting nothing', () => {
    const test = install(fakeClock()).page.__desk?.test;
    expect(() => test?.applyFx('nope')).toThrow('unknown phaser type: nope');
  });
});
