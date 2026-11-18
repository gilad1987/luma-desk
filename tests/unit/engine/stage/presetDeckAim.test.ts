/**
 * Owns the deck targets of the position presets on another deck, with the fixtures of that stage's own rig: center,
 * down and cross read where a fixture hangs in built-in deck metres (`fromDeck`), so its place is fitted once, and
 * every deck target is moved onto the deck (`onDeck`). The values on the built-in stage are owned by
 * `presetFnsOf.test.ts` (equal to `PRESET_FNS`).
 */
import { describe, expect, it } from 'vitest';
import { aimAt } from '../../../../src/domain/aim';
import type { Fixture } from '../../../../src/domain/Fixture';
import { rigFromDesign } from '../../../../src/domain/stage/deriveRig';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign';
import { frameOf } from '../../../../src/domain/stage/StageFrame';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { PRESET_FNS } from '../../../../src/engine/presetFunctions';
import { presetFnsOf } from '../../../../src/engine/stage/presetFnsOf';

const theatre = createTemplate('theatre');
const fns = presetFnsOf(frameOf(theatre));
const rig = rigFromDesign(theatre).fixtures;
/** The theatre deck: 10 x 8 m, 1 m high, centred on x = 0, its downstage edge at z = 0. */
const FIT = { scaleX: 10 / 46, offsetX: 0, scaleZ: 8 / 21.6, offsetZ: -0.2222222222222222, lift: 1 - 1.8 };
const Y = 1;
/** The deck z of the built-in deck z `z`; on the theatre deck it is exactly `z * 10/27 - 2/9`. */
const deckZ = (z: number): number => (z * 10 - 6) / 27;
const byId = (id: number): Fixture => rig.find((f) => f.id === id) ?? expect.fail(`theatre fixture ${id}`);
const aims = (name: keyof typeof fns, table = fns, list = rig) => list.map((f, k) => table[name](f, k, list.length));

describe('position presets on the theatre deck', () => {
  it('reads the fit of the theatre deck from the frame', () => {
    expect(frameOf(theatre).fit).toEqual(FIT);
  });

  it('aims center from a fixture at the right deck edge at 0.6 of the half-width', () => {
    expect(byId(106).pos).toMatchObject({ x: 5, z: 2 });
    expect(fns.center(byId(106), 0, 1)).toEqual(aimAt(byId(106), 3, Y, -13 / 6));
  });

  it('aims center at 0.6 x, a quarter of the way from the fixture z to the fitted mark', () => {
    expect(aims('center')).toEqual(rig.map((f) => aimAt(f, f.pos.x * 0.6, Y, f.pos.z / 4 - 8 / 3)));
  });

  it('aims down at 0.55 x on the fitted downstage mark', () => {
    expect(aims('down')).toEqual(rig.map((f) => aimAt(f, f.pos.x * 0.55, Y, deckZ(-1.2))));
  });

  it('aims cross at -0.9 x, upstage only for fixtures behind the fitted threshold', () => {
    const upstage = rig.filter((f) => f.pos.z < deckZ(-12));
    expect(upstage.map((f) => f.id)).toEqual([401, 402, 403, 404, 405, 406, 501, 502, 503, 504]);
    const z = (f: Fixture): number => deckZ(f.pos.z < deckZ(-12) ? -5 : -9);
    expect(aims('cross')).toEqual(rig.map((f) => aimAt(f, -f.pos.x * 0.9, Y, z(f))));
  });

  it('aims singer and drums at their built-in marks moved onto the deck', () => {
    expect(aims('singer')).toEqual(rig.map((f) => aimAt(f, 0, Y + 1.5, -1.4074074074074074)));
    expect(aims('drums')).toEqual(rig.map((f) => aimAt(f, 0, Y + 1.7, -5.111111111111111)));
  });

  it('aims the middle orchestra mark of a side at its fitted point', () => {
    const right = rig.filter((f) => f.pos.x > 0);
    expect(right.map((f) => fns.orch(f, 1, 3))).toEqual(
      right.map((f) => aimAt(f, 3.5652173913043472, Y + 1.6, -4.518518518518518)),
    );
  });

  it.each(['center', 'singer', 'drums', 'down', 'cross', 'orch'] as const)(
    '%s differs from the built-in aim',
    (name) => {
      expect(aims(name)).not.toEqual(aims(name, PRESET_FNS));
    },
  );
});

describe('position presets on a moved theatre deck', () => {
  /** The theatre with its deck and every fixture moved `dx` metres to the right. */
  const moved = (dx: number): StageDesign => ({
    ...theatre,
    deck: { ...theatre.deck, x0: theatre.deck.x0 + dx, x1: theatre.deck.x1 + dx },
    fixtures: theatre.fixtures.map((f) => ({ ...f, position: [f.position[0] + dx, f.position[1], f.position[2]] })),
  });

  it.each(['center', 'down', 'cross', 'orch'] as const)('%s aims the same when the whole stage moves 30 m', (name) => {
    const stage = moved(30);
    expect(aims(name, presetFnsOf(frameOf(stage)), rigFromDesign(stage).fixtures)).toEqual(aims(name));
  });
});
