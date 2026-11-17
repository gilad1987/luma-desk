/**
 * Owns the undo/redo stack of the builder: step order, redo clearing and the 200-step cap. It catches a lost or
 * repeated step; the edit ops it stores are tested on their own.
 */
import { describe, expect, it } from 'vitest';
import { HISTORY_CAP, History } from '../../../../../src/domain/stage/edit/History.ts';
import type { StageDesign } from '../../../../../src/domain/stage/StageDesign.ts';
import { sampleDesign } from './sampleDesign.ts';

const named = (name: string): StageDesign => ({ ...sampleDesign(), source: { kind: 'builder', name } });

describe('History', () => {
  it('undoes and redoes edits in order', () => {
    const [a, b, c] = [named('a'), named('b'), named('c')];
    const history = new History(a);
    history.push(b);
    history.push(c);
    expect([history.undo(), history.undo(), history.undo(), history.redo()]).toEqual([b, a, undefined, b]);
    expect([history.current, history.canUndo, history.canRedo]).toEqual([b, true, true]);
  });

  it('clears redo on a new edit and ignores an edit that changed nothing', () => {
    const history = new History(named('a'));
    history.push(named('b'));
    history.undo();
    history.push(history.current);
    history.push(named('c'));
    expect([history.canRedo, history.redo(), history.undo()?.source.name]).toEqual([false, undefined, 'a']);
  });

  it('keeps only the last 200 steps', () => {
    const history = new History(named('0'));
    for (let i = 1; i <= HISTORY_CAP + 5; i += 1) history.push(named(String(i)));
    let steps = 0;
    while (history.undo()) steps += 1;
    expect([HISTORY_CAP, steps, history.current.source.name]).toEqual([200, 200, '5']);
  });
});
