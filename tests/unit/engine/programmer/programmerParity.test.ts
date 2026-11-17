import { describe, expect, it } from 'vitest';
import { rng } from '../../../../src/core';
import { STEPS } from './operations';
import { engineSnapshot, legacySnapshot, outputs } from './snapshots';
import { programmerWorlds } from './worlds';

const SEEDS = 40;
const STEPS_PER_SEED = 160;
const NAMES = Object.keys(STEPS);
// state-building steps weigh more, so stores and presets meet a programmer with content
const WEIGHTED = [...NAMES, 'select', 'select', 'set', 'setSelection', 'setSelection', 'applyPreset', 'applyPhaser'];

/**
 * Feedback every branch of the programmer gives; the run must reach each, or the comparison proves too little. The
 * "selection has no colour" toast is absent: every fixture type of the rig has RGB, so it cannot happen on it.
 */
const BRANCHES = [
  'er:Store: programmer is empty',
  'ok:Stored Cue',
  'toast:Cue',
  'cueStored:',
  'ok:Clear All',
  ':Clear Selection',
  ':Clear Programmer',
  'ok:Preset 4.',
  'ok:Preset 2.',
  'ok:Phaser',
  'toast:Selected fixtures do not support this phaser',
  'toast:בחר קודם גופים (Select',
  'toast:בחר קודם גופים (Group',
  'toast:אין בחירה',
  'ok:Stored Preset',
];

/** Runs one seeded sequence, adds its feedback to `seen`, and fails on the first difference. */
function runSeed(seed: number, seen: Set<string>): number {
  const r = rng(seed * 7919 + 13);
  const w = programmerWorlds();
  const trail: string[] = [];
  for (let i = 0; i < STEPS_PER_SEED; i++) {
    const name = WEIGHTED[Math.floor(r() * WEIGHTED.length)] as string;
    const [label, mine, theirs] = (STEPS[name] as (typeof STEPS)[string])(w, r);
    trail.push(label);
    const where = `seed ${seed} step ${i}: ${trail.slice(-6).join(' | ')}`;
    expect(mine, where).toStrictEqual(theirs);
    expect(engineSnapshot(w), where).toStrictEqual(legacySnapshot(w));
    if (name === 'frame') {
      const o = outputs(w);
      expect(o.engine, where).toBe(o.legacy);
    }
  }
  for (const m of w.engine.messages) seen.add(m);
  return STEPS_PER_SEED;
}

describe('Programmer parity with the original programmer code', () => {
  it(`matches on ${SEEDS} seeded sequences of ${STEPS_PER_SEED} operations`, () => {
    let compared = 0;
    const seen = new Set<string>();
    for (let seed = 1; seed <= SEEDS; seed++) compared += runSeed(seed, seen);
    expect(compared).toBe(SEEDS * STEPS_PER_SEED);
    const missed = BRANCHES.filter((b) => ![...seen].some((m) => m.startsWith(b)));
    expect(missed).toEqual([]);
  });
});
