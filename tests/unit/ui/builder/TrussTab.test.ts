/**
 * Owns the Trusses tab: preset buttons add the right truss and select it, the list selects, and the size fields of the
 * selected truss resize it. The truss ops themselves are owned by tests/unit/domain/stage/edit.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addPresetTruss, setTrussProps } from '../../../../src/domain/stage/edit/trussOps';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { EditorSession } from '../../../../src/ui/builder/EditorSession.ts';
import { TrussTab } from '../../../../src/ui/builder/TrussTab.ts';
import { asReal, FakeDom, type FakeElement } from '../../../shared/dom';
import { fakeStage } from './fakeStage.ts';
import { button, change, click, control, descendants, prop } from './toolsDom.ts';

describe('TrussTab', () => {
  let session: EditorSession, root: FakeElement, start: StageDesign;
  beforeEach(() => {
    new FakeDom();
    start = createTemplate('empty');
    session = new EditorSession({ stage: fakeStage(start) });
    const tab = new TrussTab(session);
    session.onChange(() => tab.render());
    root = asReal<FakeElement>(tab.root);
  });
  afterEach(() => vi.unstubAllGlobals());
  const listed = (): FakeElement[] => descendants(root).filter((el) => el.classList.contains('truss-item'));
  const { x0, x1, z0, z1 } = createTemplate('empty').deck;

  it('adds a straight truss at 6 m over the deck centre and selects it', () => {
    click(button(root, 'Straight'));
    const added = session.draft.trusses.at(-1);
    expect([session.draft, session.selection.trusses, listed().map((el) => prop(el, 'ariaPressed'))]).toEqual([
      addPresetTruss(start, 'straight', [(x0 + x1) / 2, 6, (z0 + z1) / 2]),
      [added?.id],
      ['true'],
    ]);
  });

  it('stands a new tower on the ground 1 m outside the stage-left deck edge', () => {
    click(button(root, 'Tower'));
    expect(session.draft).toEqual(addPresetTruss(start, 'tower', [x0 - 1, 0, (z0 + z1) / 2]));
  });

  it('selects a truss from the list', () => {
    click(button(root, 'Circle'));
    click(button(root, 'Goalpost'));
    const [circle] = listed();
    click(circle ?? root);
    expect(session.selection.trusses).toEqual([session.draft.trusses[0]?.id]);
  });

  it('resizes the selected straight truss along its own axis', () => {
    click(button(root, 'Straight'));
    const added = session.draft;
    const truss = added.trusses[0];
    change(control(root, 'Length (m)'), '12');
    const params = { kind: 'straight', a: [-5, 0, 0], b: [7, 0, 0], section: 0.4 } as const;
    expect(session.draft).toEqual(setTrussProps(added, truss?.id ?? '', { params }));
  });

  it('shows the radius of a circle and the width and height of a goalpost', () => {
    click(button(root, 'Circle'));
    const circleRadius = control(root, 'Radius (m)').value;
    click(button(root, 'Goalpost'));
    expect([circleRadius, control(root, 'Width (m)').value, control(root, 'Height (m)').value]).toEqual([
      '4',
      '8',
      '6',
    ]);
  });
});
