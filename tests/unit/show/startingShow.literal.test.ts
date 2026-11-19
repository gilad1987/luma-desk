/**
 * The first looks that earlier desk versions built, as literal cues recorded from those versions and not rebuilt by
 * the current code. `isStartingShow` must still know each one, so a rig change may replace a show that holds it, and
 * must not know it after one changed value. `buildMvrFirstLook` of the named commit wrote each file in
 * `tests/fixtures` for a template whose design is the same at every commit named here:
 * - `c51b30f7`: the redesigned look at key 3. Theatre: the key units stand at 20, below 100, so key 3 and key 10
 *   give different cues and the current look cannot stand in for it.
 * - `6114b2a` (`main` after PR #5 and PR #6): the look before the redesign. Theatre is a small rig (key at 100);
 *   festival is a big rig that shares a light budget (33, 20, 15).
 * `main` after PR #4 (`c42c603f`) built the same theatre cue byte for byte.
 */
import { describe, expect, it } from 'vitest';
import { isSameData } from '../../../src/domain/stage/sameData';
import type { Cue } from '../../../src/engine/CueList';
import { buildMvrFirstLook, MVR_FIRST_LOOK_NAME } from '../../../src/show/mvrLook/mvrFirstLook';
import { isStartingShow } from '../../../src/show/startingShow/isStartingShow';
import { readSavedShow, startingShowWorld } from '../../shared';

/** The template, the commit that built the look, and the level of fixture 101 in it. */
const CASES = [
  ['theatre', 'c51b30f7', 20],
  ['theatre', '6114b2a', 100],
  ['festival', '6114b2a', 33],
] as const;

describe('isStartingShow on the literal first looks of earlier versions', () => {
  it.each(CASES)('knows the %s look of %s, and not after one changed value', (rig, commit, level) => {
    const look = JSON.parse(readSavedShow(`first-look-${rig}-${commit}.json`)) as Cue;
    const { world, live, show } = startingShowWorld(rig);
    show.build();
    const [first] = world.execs;
    if (first === undefined) throw new Error('no executor');
    expect(look.vals[101]?.dim).toBe(level);
    expect(isSameData([look], [buildMvrFirstLook(live)])).toBe(false);
    first.name = MVR_FIRST_LOOK_NAME;
    first.cues = [look];
    world.serializer.load(JSON.parse(world.json()) as unknown);
    expect(isStartingShow(world.execs, live)).toBe(true);
    const saved = world.execs[0]?.cues[0];
    if (saved === undefined) throw new Error('the look was not saved');
    saved.vals[101] = { ...saved.vals[101], dim: 13 };
    expect(isStartingShow(world.execs, live)).toBe(false);
  });
});
