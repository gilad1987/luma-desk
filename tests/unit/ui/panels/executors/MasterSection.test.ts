import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MasterSection } from '../../../../../src/ui/panels/executors/MasterSection';
import { FakeDom } from '../../fakes/installFakeDom';
import { executorsFakes } from './executorsFakes';

const IDS = ['mSelName', 'pauseBtn', 'boBtn', 'bpmBox', 'gmVal', 'gmFader', 'goBig', 'goBack', 'offBtn', 'tapBtn'];

// legacy: index.html at 48a3b63, lines 2243-2250 (master keys) and loop() line 2540 (GM readout)
describe('MasterSection', () => {
  let dom: FakeDom;
  beforeEach(() => {
    dom = new FakeDom();
    for (const id of IDS) dom.add(id);
  });
  afterEach(() => vi.unstubAllGlobals());

  const setup = () => {
    const fakes = executorsFakes();
    const master = new MasterSection(fakes.deps);
    const click = (id: string): void => dom.get(id).onclick?.({ target: null });
    return { ...fakes, master, click };
  };

  it('GO, BACK, PAUSE and OFF act on the executor selected at click time', () => {
    const { state, execs, pool, click } = setup();
    const [, , third] = execs;
    if (!third) throw new Error('no executor 3');
    const pause = vi.spyOn(third, 'pause').mockImplementation(() => undefined);
    const off = vi.spyOn(third, 'off').mockImplementation(() => undefined);
    state.selectExec(2);
    click('goBig');
    click('goBack');
    click('pauseBtn');
    click('offBtn');
    expect(pool.go.mock.calls).toEqual([
      [third, 1],
      [third, -1],
    ]);
    expect(pause).toHaveBeenCalledOnce();
    expect(off).toHaveBeenCalledOnce();
  });

  it('B.O. toggles the blackout', () => {
    const { state, click } = setup();
    click('boBtn');
    expect(state.blackout).toBe(true);
    click('boBtn');
    expect(state.blackout).toBe(false);
  });

  it('TAP taps the tempo at the clock time in milliseconds', () => {
    const { tempo, click } = setup();
    const tap = vi.spyOn(tempo, 'tap');
    click('tapBtn');
    expect(tap).toHaveBeenCalledWith(5000);
  });

  it.each([
    [0.456, '46'],
    [0.444, '44'],
    [1, '100'],
  ])('shows Grand Master %f as %s', (gm, text) => {
    const { state, master } = setup();
    state.gm = gm;
    master.paintLevels();
    expect(dom.get('gmVal').textContent).toBe(text);
  });
});
