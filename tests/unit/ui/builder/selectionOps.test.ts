/**
 * Owns the Duplicate and Delete edits of the builder selection: a picked truss brings its own fixtures, so a picked
 * fixture on a picked truss is copied once, not twice; a loose picked fixture is still copied; a hidden wall's screen
 * fixture leaves the selection, so Delete cannot reach it. The single-item ops are owned by tests/unit/domain/stage/edit.
 */
import { describe, expect, it, vi } from 'vitest';
import { setSceneryPart } from '../../../../src/domain/stage/edit/deckOps.ts';
import { setLedWall } from '../../../../src/domain/stage/edit/ledWall.ts';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign';
import { EditorSession } from '../../../../src/ui/builder/EditorSession.ts';
import { NO_SELECTION } from '../../../../src/ui/builder/selection.ts';
import { deleteSelection, duplicateSelection } from '../../../../src/ui/builder/selectionOps.ts';
import { fakeStage } from './fakeStage.ts';
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

  it('unselects the screen fixture when the wall is hidden, so Delete keeps the hidden wall', () => {
    vi.useFakeTimers();
    const session = new EditorSession({ stage: fakeStage(setLedWall(d, { width: 8, height: 4 })) });
    const screenId = session.draft.screens[0]?.fixtureId ?? -1;
    session.select({ fixtures: [screenId], trusses: [] });
    expect(session.selection.fixtures).toEqual([screenId]);
    session.edit((draft) => setSceneryPart(draft, 'ledWall', false));
    const hidden = session.draft;
    expect([session.selection, session.edit(deleteSelection(session.selection))]).toEqual([NO_SELECTION, null]);
    expect(session.draft).toBe(hidden);
    vi.useRealTimers();
  });
});
