/**
 * Owns the screen step's random parity: on a stage without a screen it draws the same values and sets nothing, so the
 * rest of the look keeps its random stream. Which ids a whole look writes is owned by lookStages.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { rng } from '../../../src/core';
import { buildRig } from '../../../src/domain/rig';
import type { LookOptions } from '../../../src/autoshow/AutoSettings';
import { buildAutoGroups, type AutoGroups } from '../../../src/autoshow/autoGroups';
import { addStrobesAndScreen } from '../../../src/autoshow/look/addStrobesAndScreen';
import { LookDraft } from '../../../src/autoshow/look/LookDraft';
import { STYLES, type AutoStyleId } from '../../../src/autoshow/styles';

const rig = buildRig();
const groups = buildAutoGroups(rig);
const SCREEN_ON: LookOptions = { energy: 1, strobes: true, screen: true };

/** The screen step of one drop look, with the number of random draws the whole look took. */
function screenStep(id: AutoStyleId, look: AutoGroups) {
  let draws = 0;
  const random = rng(3);
  const counted = (): number => {
    draws += 1;
    return random();
  };
  const draft = new LookDraft({ rig, groups: look, random: counted }, STYLES[id], 'drop', SCREEN_ON);
  addStrobesAndScreen(draft);
  return { draws, vals: draft.vals };
}

describe('addStrobesAndScreen on a stage without a screen', () => {
  it('has the built-in LED screen as its only screen group', () => {
    expect(groups.screen).toEqual(rig.screenIds());
    expect(groups.screen).toHaveLength(1);
  });

  it.each(['edm', 'rock', 'mizrahi'] as AutoStyleId[])('keeps the random draws of %s and sets no screen', (id) => {
    const withScreen = screenStep(id, groups);
    const without = screenStep(id, { ...groups, screen: [] });
    expect(without.draws).toBe(withScreen.draws);
    for (const screen of groups.screen) {
      expect(withScreen.vals[screen]?.dim).toBeGreaterThan(0);
      expect(without.vals[screen]).toBeUndefined();
    }
  });
});
