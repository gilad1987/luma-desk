/**
 * Owns the aim of an applied computed preset: with a `RigSource` in the programmer deps it aims at the frame of the
 * current stage (`presetFnsOf`), not at the built-in stage (`PRESET_FNS`). Which presets apply at all (G10) is owned by
 * `presetAvailability.test.ts`; the built-in values by the programmer parity tests.
 */
import { describe, expect, it } from 'vitest';
import { PRESET_FNS } from '../../../../src/engine/presetFunctions';
import { presetFnsOf } from '../../../../src/engine/stage/presetFnsOf';
import { rigWorld } from './qa/rigWorld';

describe('applyPreset on a custom stage', () => {
  it('aims a ring preset at the ring of the current stage (festival: a smaller circle truss)', () => {
    const w = rigWorld();
    w.to('festival');
    w.presets.replace({ 1: {}, 2: { 5: { name: 'Cone', kind: 'fn', fn: 'ringCone' } }, 3: {}, 4: {}, 5: {} });
    const hung = w.service.rig.fixtures.filter((f) => f.mount !== 'floor').slice(0, 4);
    w.selection.set(hung.map((f) => f.id));
    w.programmer.applyPreset(2, 5);
    const fns = presetFnsOf(w.service.frame);
    const stage = hung.map((f, k) => fns.ringCone(f, k, hung.length));
    const builtIn = hung.map((f, k) => PRESET_FNS.ringCone(f, k, hung.length));
    expect([hung.length, stage]).not.toEqual([hung.length, builtIn]);
    expect(hung.map((f) => w.programmer.vals[f.id])).toEqual(stage);
  });
});
