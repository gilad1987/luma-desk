import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CueHud } from '../../../../../src/ui/panels/executors/CueHud';
import { FakeDom } from '../../../../shared/dom';
import { executorsFakes } from './executorsFakes';

// legacy: updateExecUI in index.html at 48a3b63, lines 2184-2185
describe('CueHud.paint bar width', () => {
  let dom: FakeDom;
  beforeEach(() => {
    dom = new FakeDom();
    for (const id of ['hudExec', 'hudCue', 'hudNext', 'hudBar']) dom.add(id);
  });
  afterEach(() => vi.unstubAllGlobals());

  const setup = () => {
    const fakes = executorsFakes();
    const exec = fakes.execs[0];
    if (!exec) throw new Error('no executor');
    const hud = new CueHud(fakes.deps);
    const width = (): string => {
      hud.paint(exec, 0);
      return dom.get('hudBar').style.width;
    };
    return { ...fakes, exec, width };
  };

  it('wraps a negative bar count into the look with a double modulo while Auto runs', () => {
    const { autoShow, tempo, clock, width } = setup();
    autoShow.on = true;
    tempo.setBeatOrigin(10);
    clock.seconds = 0; // (0 - 10) s at 120 BPM = -5 bars; -5 mod 4 bars is 3, not -1
    expect(width()).toBe('75%');
  });

  it('shows a paused fade frozen at pausedAt, and a running fade from the clock', () => {
    const { exec, clock, width } = setup();
    clock.seconds = 3;
    exec.fade = { from: {}, to: {}, t0: 1, dur: 4, paused: true, pausedAt: 1 };
    expect(width()).toBe('25%');
    exec.fade = { from: {}, to: {}, t0: 1, dur: 4, paused: false };
    expect(width()).toBe('50%');
  });

  it('is full while on without a fade, and 0 while off', () => {
    const { exec, width } = setup();
    exec.on = true;
    expect(width()).toBe('100%');
    exec.on = false;
    expect(width()).toBe('0');
  });
});
