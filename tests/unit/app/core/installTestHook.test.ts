import { afterEach, describe, expect, it, vi } from 'vitest';
import { FakeElement } from '../../../shared/dom';
import { fakeClock, FakeObserver, installOnFakePage as install } from './hookPage';

afterEach(() => vi.unstubAllGlobals());

describe('installTestHook', () => {
  it('publishes nothing on a page without the ?test clock (decision 23)', () => {
    expect(install().page.__desk).toBeUndefined();
  });

  it('keeps exactly the fields the specs read', () => {
    const { page, engine, setView } = install(fakeClock());
    expect(Object.keys(page.__desk ?? {}).join()).toBe('setView,fixtures,stage,applyTemplate,renderMemory,test');
    expect(page.__desk?.fixtures).toBe(engine.stage.rig.fixtures);
    expect(page.__desk?.setView).toBe(setView);
  });

  it('reads fixtures from the stage at each access, so they follow a template change', () => {
    const { page, engine } = install(fakeClock());
    page.__desk?.applyTemplate('theatre');
    expect([page.__desk?.fixtures, engine.stage.rig.fixtures.length]).toEqual([engine.stage.rig.fixtures, 30]);
  });

  it('moves the clock forward only in outputAt and returns every fixture output with its id', () => {
    const { page, engine } = install(fakeClock());
    const test = page.__desk?.test;
    const out = test?.outputAt(12);
    expect(test?.now()).toBe(12000);
    test?.outputAt(5);
    expect(test?.now()).toBe(12000);
    expect(out?.map((o) => o.id)).toEqual(engine.stage.rig.fixtures.map((f) => f.id));
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

  it('passes mvrReady through and reads mvrStage() live from the engine stage', async () => {
    const { page, mvrReady } = install(fakeClock());
    page.__desk?.applyTemplate('theatre');
    expect(page.__desk?.test.mvrStage()).toMatchObject({ kind: 'template', fixtureCount: 30 });
    await page.__desk?.test.mvrReady();
    expect(mvrReady).toHaveBeenCalledOnce();
  });

  it('rejects an unknown phaser type instead of starting nothing', () => {
    const test = install(fakeClock()).page.__desk?.test;
    expect(() => test?.applyFx('nope')).toThrow('unknown phaser type: nope');
  });
});
