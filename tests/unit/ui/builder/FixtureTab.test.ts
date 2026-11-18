/**
 * Owns the Fixtures tab: "Add N fixtures" runs the truss or floor-row op with the picked type and count, sets the
 * picked role on the new fixtures only, as one undo step, and shows a refused count. Spacing is owned by the domain.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addFixturesOnTruss, addFloorRow } from '../../../../src/domain/stage/edit/addFixtures';
import { addPresetTruss } from '../../../../src/domain/stage/edit/trussOps';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { EditorSession } from '../../../../src/ui/builder/EditorSession.ts';
import { FixtureTab } from '../../../../src/ui/builder/FixtureTab.ts';
import { asReal, FakeDom, type FakeElement } from '../../../shared/dom';
import { fakeStage } from './fakeStage.ts';
import { button, change, click, control, shownErrors } from './toolsDom.ts';

describe('FixtureTab', () => {
  let session: EditorSession, root: FakeElement, start: StageDesign;
  beforeEach(() => {
    new FakeDom();
    start = addPresetTruss(addPresetTruss(createTemplate('empty'), 'straight', [0, 6, 0]), 'circle', [0, 8, 0]);
    session = new EditorSession({ stage: fakeStage(start) });
    const tab = new FixtureTab(session);
    session.onChange(() => tab.render());
    root = asReal<FakeElement>(tab.root);
  });
  afterEach(() => vi.unstubAllGlobals());
  const add = (): void => click(button(root, 'Add fixtures'));

  it('adds 6 washes on the first truss by default', () => {
    add();
    expect(session.draft).toEqual(
      addFixturesOnTruss(start, { trussId: start.trusses[0]?.id ?? '', type: 'wash', count: 6 }),
    );
  });

  it('adds the picked type and count on the picked truss', () => {
    const trussId = start.trusses[1]?.id ?? '';
    change(control(root, 'Type'), 'spot');
    change(control(root, 'Count'), '8');
    change(control(root, 'On'), trussId);
    add();
    expect(session.draft).toEqual(addFixturesOnTruss(start, { trussId, type: 'spot', count: 8 }));
  });

  it('adds a floor row along the deck front, 0.5 m inside the edges', () => {
    change(control(root, 'On'), '');
    change(control(root, 'Count'), '4');
    add();
    const { x0, x1, z1, height } = start.deck;
    const row = {
      type: 'wash',
      count: 4,
      from: [x0 + 0.5, height, z1 - 0.5],
      to: [x1 - 0.5, height, z1 - 0.5],
    } as const;
    expect(session.draft).toEqual(addFloorRow(start, row));
  });

  it('sets the picked role on the new fixtures only, as one undo step', () => {
    change(control(root, 'Role'), 'blinder');
    add();
    add();
    const roles = session.draft.fixtures.map((f) => f.role);
    session.undo();
    expect([roles.length, new Set(roles), session.draft.fixtures.length]).toEqual([12, new Set(['blinder']), 6]);
  });

  it('does not send an invalid count, and shows the domain text of a refused one', () => {
    change(control(root, 'Count'), '0');
    const invalid = shownErrors(root);
    change(control(root, 'Count'), '2.5');
    add();
    expect([invalid.length, session.canUndo, shownErrors(root)]).toEqual([
      1,
      false,
      [expect.stringContaining('addFixtures: count must be >= 1, got 2.5') as unknown],
    ]);
  });
});
