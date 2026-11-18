/**
 * Owns the edit toolbar: each button runs its edit on the session as one undo step, a refused edit is reported, and
 * the disabled state follows history and selection. The edit ops themselves are owned by tests/unit/domain/stage/edit.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mirrorLeftToRight } from '../../../../src/domain/stage/edit/mirror.ts';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { EditorSession } from '../../../../src/ui/builder/EditorSession.ts';
import { EditToolbar } from '../../../../src/ui/builder/EditToolbar.ts';
import { asReal, FakeDom, FakeElement } from '../../../shared/dom';
import { sampleDesign } from '../../domain/stage/edit/sampleDesign.ts';
import { fakeStage } from './fakeStage.ts';

/** The session members the toolbar reads, as a plain object a test can override one by one. */
const sessionMembers = (s: EditorSession) => ({
  undo: () => s.undo(),
  redo: () => s.redo(),
  edit: (op: Parameters<EditorSession['edit']>[0]) => s.edit(op),
  selection: s.selection,
  canUndo: s.canUndo,
  canRedo: s.canRedo,
  onChange: (listener: () => void) => s.onChange(listener),
});

describe('EditToolbar', () => {
  let root: FakeElement, session: EditorSession, report: ReturnType<typeof vi.fn<(text: string) => void>>;
  let toolbar: EditToolbar;
  beforeEach(() => {
    new FakeDom();
    root = new FakeElement();
    session = new EditorSession({ stage: fakeStage(createTemplate('theatre')) });
    report = vi.fn<(text: string) => void>();
    toolbar = new EditToolbar(asReal<HTMLElement>(root), session, report);
  });
  afterEach(() => vi.unstubAllGlobals());
  const button = (action: string): FakeElement => root.part(`[data-edit="${action}"]`);
  const click = (action: string): void => button(action).onclick?.({ target: undefined });
  const disabled = (): string[] =>
    ['undo', 'redo', 'duplicate', 'delete', 'mirror'].filter((a) => button(a).classList.contains('is-disabled'));

  it('starts with Undo, Redo, Duplicate and Delete disabled and Mirror enabled', () => {
    expect(disabled()).toEqual(['undo', 'redo', 'duplicate', 'delete']);
  });

  it('duplicates and deletes the selected truss with its fixtures, each as one undo step', () => {
    const truss = session.draft.trusses[0];
    const onTruss = session.draft.fixtures.filter((f) => f.trussId === truss?.id).length;
    session.select({ fixtures: [], trusses: [truss?.id ?? ''] });
    const start = session.draft;
    click('duplicate');
    const copied = session.draft;
    click('delete');
    expect([copied.fixtures.length - start.fixtures.length, session.draft.trusses.length]).toEqual([
      onTruss,
      start.trusses.length,
    ]);
    click('undo');
    click('undo');
    expect([session.draft === start, disabled()]).toEqual([true, ['undo', 'duplicate', 'delete']]);
  });

  it('mirrors the draft as one undo step', () => {
    const mirrored = new EditorSession({ stage: fakeStage(sampleDesign()) });
    const bar = new EditToolbar(asReal<HTMLElement>(new FakeElement()), mirrored, report);
    bar.run('mirror');
    expect([mirrored.draft, mirrored.canUndo]).toEqual([mirrorLeftToRight(sampleDesign()), true]);
  });

  it('reports the text of a refused edit instead of throwing', () => {
    const refusing = { ...sessionMembers(session), edit: () => 'no room' };
    new EditToolbar(asReal<HTMLElement>(new FakeElement()), refusing, report).run('mirror');
    expect(report.mock.calls).toEqual([['no room']]);
  });

  it('stops repainting after dispose', () => {
    toolbar.dispose();
    session.select({ fixtures: [session.draft.fixtures[0]?.id ?? 0], trusses: [] });
    expect(disabled()).toEqual(['undo', 'redo', 'duplicate', 'delete']);
  });
});
