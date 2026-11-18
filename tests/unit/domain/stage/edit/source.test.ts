/**
 * Owns `markBuilt`: the source a committed builder stage carries in the saved show (plan e2e: `source.kind ===
 * 'builder'`). How the session decides to call it is owned by tests/unit/ui/builder.
 */
import { describe, expect, it } from 'vitest';
import { markBuilt } from '../../../../../src/domain/stage/edit/source.ts';
import { sampleDesign } from './sampleDesign.ts';

describe('markBuilt', () => {
  it('marks the source as builder, keeps the MVR fileHash and every other field, an unknown extra one included', () => {
    const start = { ...sampleDesign(), source: { kind: 'mvr', name: 'hall', fileHash: 'abc' }, extra: 1 } as const;
    const built = markBuilt(start, 'hall');
    expect(built).toEqual({ ...start, source: { kind: 'builder', name: 'hall', fileHash: 'abc' } });
  });

  it('adds no fileHash key when the source has none', () => {
    const built = markBuilt({ ...sampleDesign(), source: { kind: 'template', name: 'theatre' } }, 'mine');
    expect(Object.keys(built.source)).toEqual(['kind', 'name']);
  });

  it('returns the design itself when it is already the same builder build', () => {
    const built = markBuilt(sampleDesign(), 'mine');
    expect([markBuilt(built, 'mine') === built, markBuilt(built, 'other') === built]).toEqual([true, false]);
  });
});
