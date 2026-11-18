import { describe, expect, it } from 'vitest';
import { applyAction } from './actions';
import { compareExecutors, compareFrame, type Tally } from './compareWorlds';
import { engineWorld } from './engineWorld';
import { legacyWorld } from './legacyWorld';
import { randomScenario } from './scenario';

const SEEDS = [1, 2, 3, 4, 5, 6];
const FRAMES = 500;

describe('playback parity with the original code (bit-exact)', () => {
  for (const seed of SEEDS) {
    it(`seed ${seed}: fixture.out, fixture.base, executor state and messages match every frame`, () => {
      const now = engineWorld();
      const old = legacyWorld();
      const tally: Tally = { samples: 0, mismatchCount: 0, mismatches: [] };
      for (const step of randomScenario(seed, now.rig.fixtures, FRAMES)) {
        now.clock.seconds = step.clock;
        old.env.now = step.clock;
        for (const act of step.actions) applyAction(act, now, old);
        now.frame(step.t);
        old.frame(step.t);
        compareFrame(now, old, step.t, tally);
        compareExecutors(now, old, step.t, tally);
      }
      console.info(`parity seed ${seed}: ${tally.samples} samples, ${tally.mismatchCount} mismatches`);
      expect(tally.mismatches).toEqual([]);
      expect(tally.samples).toBe(FRAMES * now.rig.fixtures.length * 10 * 2);
      expect(now.messages.length).toBeGreaterThan(10);
    });
  }
});
