import type { StageDesign, StageFixture } from '../StageDesign';
import { nextIdBlock } from './ids';

/** The truss id a copy of a fixture links to. */
export type TrussIdOf = (f: StageFixture) => string | null;

/**
 * Appends copies of `sources` with new ids from the next free block, each linked to the truss `trussIdOf` names.
 * Duplicate and mirror share it, so copies always get ids no live fixture holds.
 */
export function appendCopies(d: StageDesign, sources: readonly StageFixture[], trussIdOf: TrussIdOf): StageDesign {
  const first = nextIdBlock(d);
  const copies = sources.map((f, i): StageFixture => ({ ...f, id: first + i, trussId: trussIdOf(f) }));
  return { ...d, fixtures: [...d.fixtures, ...copies] };
}
