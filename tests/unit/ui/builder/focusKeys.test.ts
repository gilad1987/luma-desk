/**
 * Owns the focus keys of the builder panels: no two controls of one panel share a key, even where labels repeat (the
 * two LED wall boxes, one Remove per riser, trusses with one name), so `renderKeepingFocus` gives the focus back to
 * the control the user used. A shared key sent the focus to the wall box, and Space then deleted the wall.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addRiser } from '../../../../src/domain/stage/edit/deckOps';
import { setLedWall } from '../../../../src/domain/stage/edit/ledWall';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { EditorSession } from '../../../../src/ui/builder/EditorSession.ts';
import { FixtureTab } from '../../../../src/ui/builder/FixtureTab.ts';
import { PropertyPanel } from '../../../../src/ui/builder/PropertyPanel.ts';
import { StageTab } from '../../../../src/ui/builder/StageTab.ts';
import { TrussTab } from '../../../../src/ui/builder/TrussTab.ts';
import { asReal, FakeDom, FakeElement } from '../../../shared/dom';
import { fakeStage } from './fakeStage.ts';
import { check, descendants } from './toolsDom.ts';

/** Two risers, an LED wall and every truss named 'Pipe': each label that can repeat in a panel repeats. */
function repeatedLabels(): StageDesign {
  const walled = setLedWall(createTemplate('theatre'), { width: 8, height: 4.5 });
  const risers = addRiser(addRiser(walled, [-2, 1, 2], [2, 0.4, 2]), [2, 1, 2], [2, 0.4, 2]);
  return { ...risers, trusses: risers.trusses.map((truss) => ({ ...truss, name: 'Pipe' })) };
}

describe('focus keys', () => {
  let session: EditorSession, start: StageDesign;
  beforeEach(() => {
    new FakeDom();
    start = repeatedLabels();
    session = new EditorSession({ stage: fakeStage(start) });
  });
  afterEach(() => vi.unstubAllGlobals());
  const rootOf = (panel: { root: HTMLElement }): FakeElement => asReal<FakeElement>(panel.root);
  const keysOf = (root: FakeElement): string[] => descendants(root).flatMap((el) => el.dataset['focusKey'] ?? []);
  const repeated = (keys: string[]): string[] => keys.filter((key, at) => keys.indexOf(key) !== at);
  /** The checkbox of every `<label>` whose text is 'LED wall', in DOM order: the wall's own box, then Scenery's. */
  const ledWallBoxes = (root: FakeElement): FakeElement[] =>
    descendants(root).flatMap((el) =>
      el.tagName === 'label' && el.children[0]?.textContent === 'LED wall' ? (el.children[1] ?? []) : [],
    );

  it('gives the focus back to the Scenery LED wall box, not to the wall box, after it is toggled', () => {
    const tab = new StageTab(session);
    session.onChange(() => tab.render());
    const root = rootOf(tab);
    const scenery = ledWallBoxes(root)[1];
    if (!scenery) throw new Error('the Stage tab shows two LED wall boxes');
    Object.assign(document, { activeElement: scenery });
    check(scenery, !start.scenery.ledWall);
    const focusCalls = ledWallBoxes(root).map((box) => box.focus.mock.calls.length);
    expect([session.draft.screens.length, focusCalls]).toEqual([1, [0, 1]]);
  });

  it('gives every control of each panel its own key', () => {
    const truss = start.trusses[0]?.id ?? '';
    const fixture = start.fixtures.find((f) => f.trussId === truss)?.id ?? 0;
    const stage = keysOf(rootOf(new StageTab(session)));
    const fixtures = keysOf(rootOf(new FixtureTab(session)));
    // a selected truss adds its size fields to the Trusses tab
    session.select({ fixtures: [], trusses: [truss] });
    const trusses = keysOf(rootOf(new TrussTab(session)));
    const trussProps = keysOf(rootOf(new PropertyPanel(session)));
    session.select({ fixtures: [fixture], trusses: [] });
    const fixtureProps = keysOf(rootOf(new PropertyPanel(session)));
    const panels = [stage, trusses, fixtures, trussProps, fixtureProps];
    expect([start.trusses.length > 1, panels.map((keys) => keys.length > 0), panels.map(repeated)]).toEqual([
      true,
      [true, true, true, true, true],
      [[], [], [], [], []],
    ]);
  });
});
