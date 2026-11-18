/**
 * Owns how a builder visit ends: Done applies the draft once with cause `builder` and source `builder` (the built-in
 * design as itself), Cancel puts the start design back only when a preview changed the rig. Edits are owned by
 * EditorSession.test.ts.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addPresetTruss } from '../../../../src/domain/stage/edit/trussOps.ts';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { EditorSession } from '../../../../src/ui/builder/EditorSession.ts';
import { fakeStage } from './fakeStage.ts';

const addTruss = (session: EditorSession): string | null =>
  session.edit((d) => addPresetTruss(d, 'straight', [0, 6, 0]));

describe('EditorSession commit and cancel', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('commits the draft once as a builder stage and drops the waiting preview', () => {
    const stage = fakeStage();
    const session = new EditorSession({ stage });
    addTruss(session);
    session.commit();
    vi.runAllTimers();
    expect(stage.applied).toEqual([
      { design: { ...session.draft, source: { kind: 'builder', name: 'empty' } }, cause: 'builder' },
    ]);
  });

  it('commits the built-in design as the object itself, so the show keeps no stage key', () => {
    const builtIn = createTemplate('empty');
    const stage = fakeStage(createTemplate('theatre'), builtIn);
    const session = new EditorSession({ stage });
    session.edit(() => builtIn);
    session.commit();
    expect(stage.applied.map((a) => [a.design === builtIn, a.cause])).toEqual([[true, 'builder']]);
  });

  it('treats Done on an unchanged draft as Cancel: no builder apply', () => {
    const stage = fakeStage();
    const session = new EditorSession({ stage });
    addTruss(session);
    vi.runAllTimers();
    session.undo();
    session.commit();
    vi.runAllTimers();
    expect(stage.applied.map((a) => [a.design === stage.builtIn, a.cause])).toEqual([
      [false, 'preview'],
      [true, 'preview'],
    ]);
  });

  it('cancels with the start design as a preview after a preview was shown, and with nothing before', () => {
    const stage = fakeStage();
    const before = new EditorSession({ stage });
    addTruss(before);
    before.cancel();
    vi.runAllTimers();
    expect(stage.applied).toEqual([]);
    const after = new EditorSession({ stage });
    addTruss(after);
    vi.runAllTimers();
    after.cancel();
    expect(stage.applied.map((a) => a.cause)).toEqual(['preview', 'preview']);
    expect(stage.applied[1]?.design).toBe(stage.builtIn);
  });

  it('cancels without an apply when the last preview already showed the start design', () => {
    const stage = fakeStage();
    const session = new EditorSession({ stage });
    addTruss(session);
    vi.runAllTimers();
    session.undo();
    vi.runAllTimers();
    session.cancel();
    expect(stage.applied.map((a) => a.design === stage.builtIn)).toEqual([false, true]);
  });

  it('uses the injected schedule instead of the browser timer', () => {
    const runs: (() => void)[] = [];
    const stage = fakeStage();
    const schedule = (run: () => void): (() => void) => {
      runs.push(run);
      return () => undefined;
    };
    const session = new EditorSession({ stage, schedule });
    addTruss(session);
    runs.forEach((run) => run());
    expect(stage.applied.map((a) => a.cause)).toEqual(['preview']);
  });
});
