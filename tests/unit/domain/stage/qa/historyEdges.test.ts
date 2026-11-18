/**
 * QA2: History at its ends: undo at the start, redo at the end, a new edit after undo, and a cap that drops the
 * oldest step only.
 */
import { describe, expect, it } from 'vitest';
import { setSceneryPart } from '../../../../../src/domain/stage/edit/deckOps.ts';
import { HISTORY_CAP, History } from '../../../../../src/domain/stage/edit/History.ts';
import { createTemplate } from '../../../../../src/domain/stage/templates/index.ts';

const start = createTemplate('empty');
const a = setSceneryPart(start, 'crowd', true);
const b = setSceneryPart(a, 'band', true);
const c = setSceneryPart(b, 'ledWall', true);

describe('QA2 History ends', () => {
  it('does nothing on undo at the start and redo at the end', () => {
    const h = new History(start);
    expect(h.undo()).toBeUndefined();
    expect(h.redo()).toBeUndefined();
    expect(h.current).toBe(start);
    expect([h.canUndo, h.canRedo]).toEqual([false, false]);
  });

  it('clears every redo step on a push after undo', () => {
    const h = new History(start);
    h.push(a);
    h.push(b);
    h.undo();
    h.undo();
    expect(h.canRedo).toBe(true);
    h.push(c);
    expect(h.canRedo).toBe(false);
    expect(h.redo()).toBeUndefined();
    expect(h.undo()).toBe(start);
    expect(h.undo()).toBeUndefined();
  });

  it('walks back and forth to the same objects', () => {
    const h = new History(start);
    [a, b, c].forEach((d) => h.push(d));
    expect([h.undo(), h.undo(), h.undo(), h.undo()]).toEqual([b, a, start, undefined]);
    expect([h.redo(), h.redo(), h.redo(), h.redo()]).toEqual([a, b, c, undefined]);
    expect(h.current).toBe(c);
  });

  it('keeps exactly HISTORY_CAP undo steps and drops the oldest', () => {
    const h = new History(start);
    const steps = Array.from({ length: HISTORY_CAP + 5 }, (_, i) => setSceneryPart(start, 'deck', i % 2 === 0));
    steps.forEach((d) => h.push(d));
    let undone = 0;
    let last = h.current;
    for (let d = h.undo(); d; d = h.undo()) [undone, last] = [undone + 1, d];
    expect(undone).toBe(HISTORY_CAP);
    expect(last).toBe(steps[4]);
  });
});
