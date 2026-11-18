/**
 * Owns the deck targets of the position presets on another deck: center, singer, drums, down, cross and orch aim at
 * the built-in deck marks moved by the deck fit (`onDeck`), and orch picks its side from the deck centre. The values on
 * the built-in stage are owned by `presetFnsOf.test.ts` (equal to `PRESET_FNS`).
 */
import { describe, expect, it } from 'vitest';
import { aimAt } from '../../../../src/domain/aim';
import { buildRig } from '../../../../src/domain/rig';
import { frameOf } from '../../../../src/domain/stage/StageFrame';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { PRESET_FNS } from '../../../../src/engine/presetFunctions';
import { presetFnsOf } from '../../../../src/engine/stage/presetFnsOf';

const theatre = createTemplate('theatre');
const fns = presetFnsOf(frameOf(theatre));
const hung = buildRig().fixtures.filter((f) => f.mount !== 'floor');
/** The theatre deck: 10 x 8 m, 1 m high, centred on x = 0, its downstage edge at z = 0. */
const FIT = { scaleX: 10 / 46, offsetX: 0, scaleZ: 8 / 21.6, offsetZ: -0.2222222222222222, lift: 1 - 1.8 };
const Y = 1;

describe('position presets on the theatre deck', () => {
  it('reads the fit of the theatre deck from the frame', () => {
    expect(frameOf(theatre).fit).toEqual(FIT);
  });

  it('aims singer and drums at their built-in marks moved onto the deck', () => {
    expect(hung.map((f) => fns.singer(f, 0, 1))).toEqual(hung.map((f) => aimAt(f, 0, Y + 1.5, -1.4074074074074074)));
    expect(hung.map((f) => fns.drums(f, 0, 1))).toEqual(hung.map((f) => aimAt(f, 0, Y + 1.7, -5.111111111111111)));
  });

  it('aims the middle orchestra mark of a side at its fitted point', () => {
    const right = hung.filter((f) => f.pos.x > 0);
    expect(right.map((f) => fns.orch(f, 1, 3))).toEqual(
      right.map((f) => aimAt(f, 3.5652173913043472, Y + 1.6, -4.518518518518518)),
    );
  });

  it('aims center at the fixture-relative point moved onto the deck', () => {
    const z = (f: (typeof hung)[number]): number => (-9 + (f.pos.z + 9) * 0.25) * FIT.scaleZ + FIT.offsetZ;
    const expected = hung.map((f) => aimAt(f, f.pos.x * 0.6 * FIT.scaleX + FIT.offsetX, Y, z(f)));
    expect(hung.map((f) => fns.center(f, 0, 1))).toEqual(expected);
  });

  it.each(['center', 'singer', 'drums', 'down', 'cross', 'orch'] as const)(
    '%s differs from the built-in aim',
    (name) => {
      const at = (table: typeof fns) => hung.map((f, k) => table[name](f, k, hung.length));
      expect(at(fns)).not.toEqual(at(PRESET_FNS));
    },
  );

  it('sends orch to the side of the deck centre, not of the venue centre, on an off-centre deck', () => {
    const shifted = presetFnsOf(frameOf({ ...theatre, deck: { ...theatre.deck, x0: 5, x1: 15 } }));
    const between = hung.filter((f) => f.pos.x > 0 && f.pos.x < 10);
    expect(between.length).toBeGreaterThan(0);
    expect(between.map((f) => shifted.orch(f, 1, 3))).toEqual(
      between.map((f) => aimAt(f, 10 - 3.5652173913043472, Y + 1.6, -4.518518518518518)),
    );
  });
});
