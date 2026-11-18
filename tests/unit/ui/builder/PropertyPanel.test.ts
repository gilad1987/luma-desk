/**
 * Owns the property panel: it shows the first selected fixture or truss and each field patches it with the right
 * op and values; pan/tilt only for static types. The patch rules are owned by tests/unit/domain/stage/edit.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TYPES } from '../../../../src/domain/fixtureTypes';
import { setFixtureProps } from '../../../../src/domain/stage/edit/itemOps';
import { setTrussProps } from '../../../../src/domain/stage/edit/trussOps';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { he } from '../../../../src/i18n/he';
import { EditorSession } from '../../../../src/ui/builder/EditorSession.ts';
import { PropertyPanel } from '../../../../src/ui/builder/PropertyPanel.ts';
import { trussProps } from '../../../../src/ui/builder/trussProps.ts';
import { asReal, FakeDom, FakeElement } from '../../../shared/dom';
import { fakeStage } from './fakeStage.ts';
import { change, control, descendants, shownErrors } from './toolsDom.ts';

describe('PropertyPanel', () => {
  let session: EditorSession, root: FakeElement, start: StageDesign;
  beforeEach(() => {
    new FakeDom();
    start = createTemplate('theatre');
    session = new EditorSession({ stage: fakeStage(start) });
    const panel = new PropertyPanel(session);
    session.onChange(() => panel.render());
    root = asReal<FakeElement>(panel.root);
  });
  afterEach(() => vi.unstubAllGlobals());
  const texts = (): string[] => descendants(root).map((el) => el.textContent);
  const labels = (): string[] =>
    descendants(root).flatMap((el) => (el.tagName === 'label' ? [el.children[0]?.textContent ?? ''] : []));
  const pick = (isMoving: boolean) => start.fixtures.find((f) => TYPES[f.type].moving === isMoving);

  it('shows the hint while nothing is selected', () => {
    expect(texts()).toContain(he.builder.props.nothingSelected);
  });

  it('moves the selected fixture on one axis and sets its role', () => {
    const fixture = pick(true);
    session.select({ fixtures: [fixture?.id ?? 0], trusses: [] });
    const [x, y] = fixture?.position ?? [0, 0, 0];
    change(control(root, 'Z (m)'), '3.5');
    const moved = session.draft;
    change(control(root, 'Role'), 'side');
    expect([texts(), labels(), moved, session.draft]).toEqual([
      expect.arrayContaining([`Fixture ${fixture?.id} (${fixture ? TYPES[fixture.type].name : ''})`]) as unknown,
      ['X (m)', 'Y (m)', 'Z (m)', 'Role'],
      setFixtureProps(start, fixture?.id ?? 0, { position: [x, y, 3.5] }),
      setFixtureProps(moved, fixture?.id ?? 0, { role: 'side' }),
    ]);
  });

  it('shows pan and tilt for a static type and sets the fixed aim', () => {
    const fixture = pick(false);
    session.select({ fixtures: [fixture?.id ?? 0], trusses: [] });
    const fixed = fixture?.fixed ?? { pan: 0, tilt: 0 };
    change(control(root, 'Tilt (°)'), '-20');
    expect([labels(), session.draft]).toEqual([
      ['X (m)', 'Y (m)', 'Z (m)', 'Pan (°)', 'Tilt (°)', 'Role'],
      setFixtureProps(start, fixture?.id ?? 0, { fixed: { ...fixed, tilt: -20 } }),
    ]);
  });

  it('renames the selected truss and sets its default role', () => {
    const truss = start.trusses[0];
    session.select({ fixtures: [], trusses: [truss?.id ?? ''] });
    change(control(root, 'Name'), 'Front pipe');
    const named = session.draft;
    change(control(root, 'Default role'), 'back');
    expect([named, session.draft]).toEqual([
      setTrussProps(start, truss?.id ?? '', { name: 'Front pipe' }),
      setTrussProps(named, truss?.id ?? '', { role: 'back' }),
    ]);
  });

  it('shows the text of a refused truss edit next to the fields', () => {
    const truss = start.trusses[0];
    if (!truss) throw new Error('the theatre template has no truss');
    const fields = trussProps({ edit: () => 'setTrussProps: refused' }, truss);
    const box = new FakeElement();
    for (const field of fields) box.appendChild(asReal<FakeElement>(field));
    change(control(box, 'Name'), 'x');
    expect(shownErrors(box)).toEqual(['setTrussProps: refused']);
  });
});
