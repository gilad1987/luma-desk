import { describe, expect, it } from 'vitest';
import { UiTickScheduler } from '../../../../src/app/loop/UiTickScheduler';

/** A scheduler whose callbacks write their name (and the fast tick's `now`) into one shared trace. */
function traced(): { ui: UiTickScheduler; trace: string[] } {
  const ui = new UiTickScheduler();
  const trace: string[] = [];
  ui.onFast((now) => trace.push(`fast1 ${now}`));
  ui.onFast(() => trace.push('fast2'));
  ui.onSlow(() => trace.push('slow1'));
  ui.onSlow(() => trace.push('slow2'));
  return { ui, trace };
}

describe('UiTickScheduler', () => {
  it('runs both ticks on the first frame, because the UI starts dirty, in registration order', () => {
    const { ui, trace } = traced();
    ui.tick(51, 0.051);
    expect(trace).toEqual(['fast1 0.051', 'fast2', 'slow1', 'slow2']);
  });

  it('runs the fast tick only when more than 50 ms passed since the last one', () => {
    const { ui, trace } = traced();
    ui.tick(50, 0.05);
    expect(trace).toEqual(['slow1', 'slow2']);
    trace.length = 0;
    ui.tick(100, 0.1);
    ui.tick(150, 0.15);
    ui.tick(151, 0.151);
    expect(trace).toEqual(['fast1 0.1', 'fast2', 'fast1 0.151', 'fast2']);
  });

  it('runs the slow tick when more than 400 ms passed, or on the next frame after markDirty', () => {
    const { ui, trace } = traced();
    ui.tick(10, 0.01);
    trace.length = 0;
    ui.tick(410, 0.41);
    expect(trace.filter((s) => s.startsWith('slow'))).toEqual([]);
    ui.markDirty();
    expect(trace.filter((s) => s.startsWith('slow'))).toEqual([]);
    ui.tick(420, 0.42);
    ui.tick(421, 0.421);
    expect(trace.filter((s) => s.startsWith('slow'))).toEqual(['slow1', 'slow2']);
    ui.tick(820, 0.82);
    expect(trace.filter((s) => s.startsWith('slow'))).toEqual(['slow1', 'slow2']);
    ui.tick(821, 0.821);
    expect(trace.filter((s) => s.startsWith('slow'))).toEqual(['slow1', 'slow2', 'slow1', 'slow2']);
  });

  it('clears the dirty flag after the slow callbacks, so one that marks the UI dirty does not repeat', () => {
    const ui = new UiTickScheduler();
    let runs = 0;
    ui.onSlow(() => {
      runs++;
      ui.markDirty();
    });
    ui.tick(1, 0.001);
    ui.tick(2, 0.002);
    expect(runs).toBe(1);
  });
});
