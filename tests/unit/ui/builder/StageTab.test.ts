/**
 * Owns the Stage tab: each control runs the right deck, LED wall, riser, venue or scenery op with the right values as
 * one undo step, and bad input is not sent. The ops themselves are owned by tests/unit/domain/stage/edit.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addRiser,
  removeRiser,
  setDeckSize,
  setSceneryPart,
  setVenue,
} from '../../../../src/domain/stage/edit/deckOps';
import { setLedWall } from '../../../../src/domain/stage/edit/ledWall';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { he } from '../../../../src/i18n/he';
import { EditorSession } from '../../../../src/ui/builder/EditorSession.ts';
import { StageTab } from '../../../../src/ui/builder/StageTab.ts';
import { asReal, FakeDom, type FakeElement } from '../../../shared/dom';
import { fakeStage } from './fakeStage.ts';
import { button, change, check, click, control, shownErrors } from './toolsDom.ts';

describe('StageTab', () => {
  let session: EditorSession, root: FakeElement, start: StageDesign;
  beforeEach(() => {
    new FakeDom();
    start = createTemplate('theatre');
    session = new EditorSession({ stage: fakeStage(start) });
    const tab = new StageTab(session);
    session.onChange(() => tab.render());
    root = asReal<FakeElement>(tab.root);
  });
  afterEach(() => vi.unstubAllGlobals());
  const deck = (d: StageDesign) => ({
    width: d.deck.x1 - d.deck.x0,
    depth: d.deck.z1 - d.deck.z0,
    height: d.deck.height,
  });

  it('sets each deck size with the other two kept', () => {
    change(control(root, 'Deck width (m)'), '14');
    change(control(root, 'Deck height (m)'), '1.2');
    const expected = setDeckSize(setDeckSize(start, { ...deck(start), width: 14 }), {
      ...deck(start),
      width: 14,
      height: 1.2,
    });
    expect(session.draft).toEqual(expected);
  });

  it('does not send an invalid deck size and shows the range', () => {
    change(control(root, 'Deck depth (m)'), '');
    change(control(root, 'Deck depth (m)'), '0');
    expect([session.canUndo, shownErrors(root)]).toEqual([false, [he.builder.tools.badNumber(0.1, 100)]]);
  });

  it('turns the LED wall on at 8 x 4.5 m, resizes it, and turns it off', () => {
    check(control(root, 'LED wall'), true);
    const on = session.draft;
    change(control(root, 'Wall height (m)'), '5');
    const resized = session.draft;
    check(control(root, 'LED wall'), false);
    expect([on, resized, session.draft]).toEqual([
      setLedWall(start, { width: 8, height: 4.5 }),
      setLedWall(on, { width: 8, height: 5 }),
      setLedWall(resized, null),
    ]);
  });

  it('adds a 2 x 0.4 x 2 m riser on the deck centre and removes it', () => {
    click(button(root, 'Add riser'));
    const added = session.draft;
    const { x0, x1, z0, z1, height } = start.deck;
    click(button(root, 'Remove'));
    expect([added, session.draft]).toEqual([
      addRiser(start, [(x0 + x1) / 2, height + 0.4, (z0 + z1) / 2], [2, 0.4, 2]),
      removeRiser(added, added.risers[0]?.id ?? ''),
    ]);
  });

  it('sets the venue and toggles a scenery part, each as one undo step', () => {
    change(control(root, 'Venue'), 'open-field');
    const venue = session.draft;
    check(control(root, 'Crowd'), !venue.scenery.crowd);
    expect([venue, session.draft]).toEqual([
      setVenue(start, 'open-field'),
      setSceneryPart(venue, 'crowd', !venue.scenery.crowd),
    ]);
  });
});
