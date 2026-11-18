/**
 * Owns the Duplicate and Delete edits of the builder selection: a picked truss brings its own fixtures, so a picked
 * fixture on a picked truss is copied once, not twice; a loose picked fixture is still copied. The single-item ops are
 * owned by tests/unit/domain/stage/edit.
 */
import { describe, expect, it } from 'vitest';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign';
import { deleteSelection, duplicateSelection } from '../../../../src/ui/builder/selectionOps.ts';
import { PIPE, sampleDesign } from '../../domain/stage/edit/sampleDesign.ts';

/** The fixture count per truss id ('loose' for a floor fixture), so a doubled copy shows as a larger number. */
const countsByTruss = (d: StageDesign): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const f of d.fixtures) counts[f.trussId ?? 'loose'] = (counts[f.trussId ?? 'loose'] ?? 0) + 1;
  return counts;
};

describe('selectionOps', () => {
  const d = sampleDesign();
  const onPipe = d.fixtures.filter((f) => f.trussId === PIPE.id).map((f) => f.id);
  const loose = d.fixtures.filter((f) => f.trussId === null).map((f) => f.id);

  it('copies the fixtures of a picked truss once when they are picked too, and a loose picked fixture', () => {
    const next = duplicateSelection({ fixtures: [...onPipe, ...loose], trusses: [PIPE.id] })(d);
    const copy = next.trusses.at(-1)?.id ?? '';
    const before = countsByTruss(d);
    expect([loose.length > 0, countsByTruss(next)]).toEqual([
      true,
      { ...before, [copy]: onPipe.length, loose: (before['loose'] ?? 0) + loose.length },
    ]);
  });

  it('returns the draft itself for an empty selection', () => {
    expect(duplicateSelection({ fixtures: [], trusses: [] })(d)).toBe(d);
  });

  it('deletes a picked truss with its fixtures when they are picked too', () => {
    const next = deleteSelection({ fixtures: onPipe, trusses: [PIPE.id] })(d);
    expect([next.trusses.map((t) => t.id), countsByTruss(next)[PIPE.id]]).toEqual([['left-1'], undefined]);
  });
});
