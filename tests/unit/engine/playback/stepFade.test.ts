import { afterEach, describe, expect, it, vi } from 'vitest';
import { Executor } from '../../../../src/engine/Executor';
import { stepFade } from '../../../../src/engine/Fade';

afterEach(() => vi.restoreAllMocks());

/** An executor half-way through a 2 s fade where fixture 1 changes some attributes and gains others. */
function fadingExecutor(): Executor {
  const e = new Executor(false, { nowMs: () => 0, nowSeconds: () => 0 });
  e.fade = {
    from: { '1': { pan: 0, dim: 100, gobo: 2 } },
    to: { '1': { tilt: 50, dim: 0, pan: 100 } },
    t0: 0,
    dur: 2,
    paused: false,
  };
  return e;
}

describe('stepFade', () => {
  // The review named the [key, value] entry arrays built per fixture on every frame of a fade; the Object.entries
  // call that built them is what a test can observe.
  it('blends without Object.entries, so a frame builds no entry arrays', () => {
    const e = fadingExecutor();
    const entries = vi.spyOn(Object, 'entries');
    stepFade(e, 1);
    expect(entries).not.toHaveBeenCalled();
  });

  it('keeps the key order of the original Set: the old keys first, then the ones only the target has', () => {
    const e = fadingExecutor();
    stepFade(e, 1);
    const blend = e.vals['1'];
    expect(Object.keys(blend ?? {})).toEqual(['pan', 'dim', 'gobo', 'tilt']);
    expect(blend).toEqual({ pan: 50, dim: 50, gobo: 2, tilt: 50 });
  });
});
