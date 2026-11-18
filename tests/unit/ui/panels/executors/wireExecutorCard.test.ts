import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { wireExecutorCard } from '../../../../../src/ui/panels/executors/wireExecutorCard';
import { asReal, FakeDom, FakeElement, pointer } from '../../../../shared/dom';
import { executorsFakes } from './executorsFakes';

// legacy: buildExecs in index.html at 48a3b63, lines 2157-2166
describe('wireExecutorCard', () => {
  beforeEach(() => new FakeDom());
  afterEach(() => vi.unstubAllGlobals());

  const setup = (index = 2) => {
    const fakes = executorsFakes();
    const card = new FakeElement();
    const exec = fakes.execs[index] ?? fakes.execs[0];
    if (!exec) throw new Error('no executor');
    const log: string[] = [];
    fakes.programmer.storeCue.mockImplementation(() => log.push('store'));
    vi.spyOn(fakes.state, 'selectExec').mockImplementation(() => log.push(`select, storing ${fakes.state.storeMode}`));
    wireExecutorCard(asReal<HTMLElement>(card), exec, index, fakes.deps);
    const click = (selector: string): void => card.part(selector).onclick?.({ target: null });
    return { ...fakes, card, exec, log, click };
  };

  it.each(['.ex-name', '.ex-sel'])('STORE + %s stores, leaves store mode, then selects', (selector) => {
    const { state, programmer, log, click } = setup();
    state.setStoreMode(true);
    click(selector);
    expect(programmer.storeCue).toHaveBeenCalledWith(2, null);
    expect(log).toEqual(['store', 'select, storing false']);
  });

  it('STORE + GO+ stores and selects without GO (Q13); GO+ alone selects and goes', () => {
    const { state, pool, exec, log, click } = setup();
    state.setStoreMode(true);
    click('.b-go');
    expect(log).toEqual(['store', 'select, storing false']);
    expect(pool.go).not.toHaveBeenCalled();
    click('.b-go');
    expect(pool.go).toHaveBeenCalledExactlyOnceWith(exec, 1);
  });

  it.each([
    [0, 0.7],
    [2, 0],
  ])('OFF on executor %i leaves the level at %f (Q8)', (index, level) => {
    const { exec, click } = setup(index);
    const off = vi.spyOn(exec, 'off').mockImplementation(() => undefined);
    exec.level = 0.7;
    click('.ex-off');
    expect(off).toHaveBeenCalledOnce();
    expect(exec.level).toBe(level);
  });

  it('ignores a flash press without cues and releases only a flash that is on (Q14)', () => {
    const { card, exec, pool } = setup();
    const flash = card.part('.b-flash');
    flash.onpointerdown?.(pointer(0, 0));
    expect(pool.flashPress).not.toHaveBeenCalled();
    exec.cues.push({ num: 1, name: 'Look', fade: 0, vals: {}, fx: [] });
    flash.onpointerdown?.(pointer(0, 0));
    expect(pool.flashPress).toHaveBeenCalledWith(exec);
    expect(flash.classList.contains('on')).toBe(true);
    flash.onpointerup?.(pointer(0, 0));
    expect(pool.flashRelease).not.toHaveBeenCalled();
    exec.flash = true;
    flash.onpointerleave?.(pointer(0, 0));
    expect(pool.flashRelease).toHaveBeenCalledWith(exec);
    expect(flash.classList.contains('on')).toBe(false);
  });

  it('a fader move ends a flash-only playback and sets the level', () => {
    const { card, exec, pool } = setup();
    const fader = card.part('.fader');
    fader.rect = { left: 0, top: 0, width: 10, height: 100 };
    exec.flashOnly = true;
    fader.onpointerdown?.(pointer(5, 25));
    expect(exec.flashOnly).toBe(false);
    expect(pool.setLevel).toHaveBeenCalledWith(exec, 0.75);
  });
});
