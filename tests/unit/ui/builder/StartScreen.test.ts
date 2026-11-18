/**
 * Owns the start screen flow: template cards, then venue cards, then one design with the venue set. "Current Sultan's
 * Pool rig" hands over the built-in design object itself. The card markup text is owned by the e2e builder spec.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setVenue } from '../../../../src/domain/stage/edit/deckOps.ts';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { StartScreen } from '../../../../src/ui/builder/StartScreen.ts';
import { templateCardsMarkup, venueCardsMarkup } from '../../../../src/ui/builder/startMarkup.ts';
import { asReal, FakeDom, FakeElement } from '../../../shared/dom';

describe('StartScreen', () => {
  let root: FakeElement, chosen: StageDesign[], builtIn: StageDesign;
  beforeEach(() => {
    new FakeDom();
    root = new FakeElement();
    chosen = [];
    builtIn = createTemplate('sultans-pool');
    new StartScreen(asReal<HTMLElement>(root), { builtIn, choose: (d) => chosen.push(d) }).show();
  });
  afterEach(() => vi.unstubAllGlobals());
  const click = (selector: string): void => root.part(selector).onclick?.({ target: undefined });

  it('shows the four template cards, then the venue cards after a pick', () => {
    const first = root.innerHTML;
    click('[data-template="theatre"]');
    expect([first, root.innerHTML, chosen]).toEqual([templateCardsMarkup, venueCardsMarkup, []]);
    expect(
      ['empty', 'theatre', 'festival', 'sultans-pool'].map((id) => first.includes(`data-template="${id}"`)),
    ).toEqual([true, true, true, true]);
  });

  it('chooses the picked template with the picked venue', () => {
    click('[data-template="theatre"]');
    click('[data-venue="black-box"]');
    expect(chosen).toEqual([setVenue(createTemplate('theatre'), 'black-box')]);
  });

  it('hands over the built-in design itself for the current rig in its own venue', () => {
    click('[data-template="sultans-pool"]');
    click('[data-venue="sultans-pool"]');
    expect(chosen.length === 1 && chosen[0] === builtIn).toBe(true);
  });
});
