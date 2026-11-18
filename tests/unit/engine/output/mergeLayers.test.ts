import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildRig } from '../../../../src/domain/rig';
import { Executor } from '../../../../src/engine/Executor';
import { mergeExecutors, mergeProgrammer, resetOutput } from '../../../../src/engine/output';

afterEach(() => vi.restoreAllMocks());

function firstFixture() {
  const [f] = buildRig().fixtures;
  if (!f) throw new Error('rig has no fixtures');
  return f;
}

function liveExecutor(id: number): Executor {
  const e = new Executor(false, { nowMs: () => 0, nowSeconds: () => 0 });
  e.level = 0.5;
  e.vals = { [id]: { dim: 80, pan: 30 } };
  return e;
}

// The review named the per-fixture entry array and the [key, value] pair per attribute, built on every frame. They
// are not observable from a test, but the Object.entries call that built them is.
describe('mergeExecutors and mergeProgrammer', () => {
  it('merge without Object.entries, so a frame builds no entry arrays', () => {
    const f = firstFixture();
    const o = resetOutput(f),
      active = [liveExecutor(f.id)];
    const entries = vi.spyOn(Object, 'entries');
    const slots = mergeExecutors(f, o, active, 1);
    mergeProgrammer(f, o, slots, { vals: { [f.id]: { tilt: 10 } }, fx: {} });
    expect(entries).not.toHaveBeenCalled();
  });

  it('still lays the dimmer HTP at the level and the rest LTP, with the programmer on top', () => {
    const f = firstFixture();
    const o = resetOutput(f);
    const slots = mergeExecutors(f, o, [liveExecutor(f.id)], 1);
    mergeProgrammer(f, o, slots, { vals: { [f.id]: { pan: 10 } }, fx: {} });
    expect(o).toMatchObject({ dim: 40, pan: 10 });
  });
});
