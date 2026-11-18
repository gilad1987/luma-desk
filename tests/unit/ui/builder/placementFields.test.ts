/**
 * Owns the position fields of a truss and a riser: a truss gets X, Y and Z that move it through `moveTruss` (its
 * fixtures follow) and no size fields (those are in the Trusses tab); a riser gets X and Z that move it through
 * `moveRiser`. The ops are owned by tests/unit/domain/stage/edit/placement.test.ts.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addRiser, moveRiser } from '../../../../src/domain/stage/edit/deckOps';
import { moveTruss } from '../../../../src/domain/stage/edit/trussOps';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { EditorSession } from '../../../../src/ui/builder/EditorSession.ts';
import { riserControls } from '../../../../src/ui/builder/riserControls.ts';
import { trussProps } from '../../../../src/ui/builder/trussProps.ts';
import { asReal, FakeDom, FakeElement } from '../../../shared/dom';
import { fakeStage } from './fakeStage.ts';
import { change, control, descendants } from './toolsDom.ts';

describe('position fields', () => {
  let session: EditorSession, start: StageDesign;
  beforeEach(() => {
    new FakeDom();
    start = addRiser(createTemplate('theatre'), [1, 1, 2], [2, 0.4, 2]);
    session = new EditorSession({ stage: fakeStage(start) });
  });
  afterEach(() => vi.unstubAllGlobals());
  const mount = (parts: HTMLElement[]): FakeElement => {
    const root = new FakeElement();
    parts.forEach((el) => root.appendChild(asReal<FakeElement>(el)));
    return root;
  };
  const labels = (root: FakeElement): string[] =>
    descendants(root).flatMap((el) => (el.tagName === 'label' ? [el.children[0]?.textContent ?? ''] : []));

  it('places a truss on each axis with its fixtures, and shows no size field', () => {
    const [front] = start.trusses;
    if (!front) throw new Error('the theatre template has trusses');
    const root = mount(trussProps(session, front));
    const [x, y] = front.transform.position;
    change(control(root, 'Y (m)'), '7.25');
    const raised = session.draft;
    change(control(root, 'X (m)'), '-1.5');
    expect([labels(root), raised, session.draft]).toEqual([
      ['Name', 'Default role', 'X (m)', 'Y (m)', 'Z (m)'],
      moveTruss(start, front.id, [0, 7.25 - y, 0]),
      moveTruss(raised, front.id, [-1.5 - x, 0, 0]),
    ]);
  });

  it('stores a sub-millimetre typed truss position on the nearest millimetre', () => {
    const [front] = start.trusses;
    if (!front) throw new Error('the theatre template has trusses');
    change(control(mount(trussProps(session, front)), 'Z (m)'), '1.23456');
    expect(session.draft.trusses[0]?.transform.position[2]).toBe(1.235);
  });

  it('moves a riser on X and Z only', () => {
    const [riser] = start.risers;
    if (!riser) throw new Error('the design has a riser');
    const root = mount(riserControls(start, session, () => undefined));
    change(control(root, 'Z (m)'), '-3');
    const moved = session.draft;
    change(control(root, 'X (m)'), '4');
    expect([labels(root), moved, session.draft]).toEqual([
      ['X (m)', 'Z (m)'],
      moveRiser(start, riser.id, [0, 0, -5]),
      moveRiser(moved, riser.id, [3, 0, 0]),
    ]);
  });
});
