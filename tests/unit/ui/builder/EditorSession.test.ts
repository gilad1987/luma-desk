/**
 * Owns the EditorSession draft, history, selection and preview timing: one delayed `preview` apply per burst of
 * edits, refused edits reported as text. Done and Cancel are owned by EditorSessionEnd.test.ts.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteTruss } from '../../../../src/domain/stage/edit/itemOps.ts';
import { addPresetTruss } from '../../../../src/domain/stage/edit/trussOps.ts';
import { setDeckSize } from '../../../../src/domain/stage/edit/deckOps.ts';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { EditorSession } from '../../../../src/ui/builder/EditorSession.ts';
import { fakeStage } from './fakeStage.ts';

describe('EditorSession', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('applies one preview 150 ms after the last of several edits, with the latest draft', () => {
    const stage = fakeStage();
    const session = new EditorSession({ stage });
    session.edit((d) => addPresetTruss(d, 'straight', [0, 6, 0]));
    vi.advanceTimersByTime(100);
    session.edit((d) => addPresetTruss(d, 'circle', [0, 8, 0]));
    vi.advanceTimersByTime(149);
    expect(stage.applied).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(stage.applied).toEqual([{ design: session.draft, cause: 'preview' }]);
    expect(session.draft.trusses.length).toBe(2);
  });

  it('adds no undo step, no preview and no change call for an edit that changes nothing', () => {
    const stage = fakeStage();
    const session = new EditorSession({ stage });
    const onChange = vi.fn();
    session.onChange(onChange);
    expect(session.edit((d) => d)).toBeNull();
    vi.runAllTimers();
    expect([session.canUndo, stage.applied.length, onChange.mock.calls.length]).toEqual([false, 0, 0]);
  });

  it('returns the RangeError text of a refused edit and keeps the draft', () => {
    const session = new EditorSession({ stage: fakeStage() });
    const start = session.draft;
    const refused = session.edit((d) => setDeckSize(d, { width: 0, depth: 6, height: 1 }));
    expect([refused, session.draft === start]).toEqual([expect.stringContaining('0 x 6 x 1'), true]);
  });

  it('throws an error that is not a RangeError, because that is a bug and not a refused input', () => {
    const session = new EditorSession({ stage: fakeStage() });
    expect(() =>
      session.edit(() => {
        throw new TypeError('bug');
      }),
    ).toThrow(TypeError);
  });

  it('undoes and redoes through History and previews each step', () => {
    const stage = fakeStage();
    const session = new EditorSession({ stage });
    session.edit((d) => addPresetTruss(d, 'straight', [0, 6, 0]));
    const edited = session.draft;
    session.undo();
    vi.runAllTimers();
    expect([session.draft === stage.builtIn, session.canRedo, stage.applied.at(-1)?.design === stage.builtIn]).toEqual([
      true,
      true,
      true,
    ]);
    session.redo();
    expect([session.draft === edited, session.canUndo]).toEqual([true, true]);
  });

  it('drops selected ids that an edit or an undo removed, and stops calling a disposed listener', () => {
    const session = new EditorSession({ stage: fakeStage(createTemplate('theatre')) });
    const trussId = session.draft.trusses[0]?.id ?? '';
    const fixtureId = session.draft.fixtures.find((f) => f.trussId !== trussId)?.id ?? 0;
    const listener = vi.fn();
    const stop = session.onChange(listener);
    session.select({ fixtures: [fixtureId, 99999], trusses: [trussId] });
    expect(session.selection).toEqual({ fixtures: [fixtureId], trusses: [trussId] });
    session.edit((d) => deleteTruss(d, trussId));
    expect(session.selection).toEqual({ fixtures: [fixtureId], trusses: [] });
    stop();
    session.undo();
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
