/**
 * Owns the computed presets aimed at a stage frame: the built-in frame gives exactly `PRESET_FNS` (which the oracle
 * test pins to the original), a frame without ring, screen or band falls back to the deck centre with finite values,
 * and `buildCueVals` uses the table it is given. Which presets the pool hides is owned by `presetTargets.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { aimAt } from '../../../../src/domain/aim';
import { buildRig } from '../../../../src/domain/rig';
import { frameOf } from '../../../../src/domain/stage/StageFrame';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { sultansPool } from '../../../../src/domain/stage/templates/sultansPool';
import { buildCueVals } from '../../../../src/engine/cueValues';
import { PRESET_FNS, type PresetFnName } from '../../../../src/engine/presetFunctions';
import { presetFnsOf } from '../../../../src/engine/stage/presetFnsOf';

const rig = buildRig();
const names = Object.keys(PRESET_FNS) as PresetFnName[];
// the same selection sizes and indexes as the positionPresets oracle test
const COUNTS = [1, 2, 7, 24];
/** [k, n]: a single fixture and every index of a 7-fixture fan (every k % 2 and % 3 case). */
const PLACES: readonly (readonly [number, number])[] = [
  [0, 1],
  ...Array.from({ length: 7 }, (_, k) => [k, 7] as const),
];

describe('presetFnsOf', () => {
  const builtIn = presetFnsOf(frameOf(sultansPool()));
  for (const name of names) {
    it(`${name} on the built-in frame equals PRESET_FNS for every fixture, index and selection size`, () => {
      const actual: unknown[] = [];
      const expected: unknown[] = [];
      for (const f of rig.fixtures)
        for (const n of COUNTS)
          for (let k = 0; k < Math.max(n, 7); k++) {
            actual.push(builtIn[name](f, k, n));
            expected.push(PRESET_FNS[name](f, k, n));
          }
      expect(actual).toEqual(expected);
    });
  }

  it.each(['empty', 'theatre'] as const)('returns finite numbers for every preset on the %s frame', (id) => {
    const fns = presetFnsOf(frameOf(createTemplate(id)));
    const bad = names.flatMap((name) =>
      rig.fixtures.flatMap((f) =>
        PLACES.flatMap(([k, n]) =>
          Object.entries(fns[name](f, k, n))
            .filter(([, v]) => !Number.isFinite(v))
            .map(([a, v]) => `${name} ${f.id} ${k}/${n} ${a}=${String(v)}`),
        ),
      ),
    );
    expect(bad).toEqual([]);
  });

  it('aims a ring preset at the deck centre, at deck height, when the stage has no ring', () => {
    const { deck } = frameOf(createTemplate('empty'));
    const fns = presetFnsOf(frameOf(createTemplate('empty')));
    const [x, z] = [(deck.x0 + deck.x1) / 2, (deck.z0 + deck.z1) / 2];
    const hung = rig.fixtures.filter((f) => f.mount !== 'floor').slice(0, 5);
    expect(hung.map((f) => fns.ringCone(f, 0, 1))).toEqual(hung.map((f) => aimAt(f, x, deck.height, z)));
  });
});

describe('buildCueVals with a preset table', () => {
  it('looks a preset name up in the table it is given', () => {
    const fns = presetFnsOf(frameOf(createTemplate('empty')));
    const ids = [201, 202, 203];
    expect(buildCueVals(rig, [[ids, 'ringTwist']], {}, fns)).toEqual(buildCueVals(rig, [[ids, fns.ringTwist]]));
    expect(buildCueVals(rig, [[ids, 'ringTwist']], {}, fns)).not.toEqual(buildCueVals(rig, [[ids, 'ringTwist']]));
  });
});
