import type { StageDesign } from '../StageDesign';
import type { StageSource } from '../types';

/**
 * Marks a design as the user's own build, so a saved show records that its stage came from the builder and not from
 * a template or an MVR file. An MVR `fileHash` is kept: it is the key of the original MVR bytes, which the builder
 * never edits, so the stage can still find its source file. A design already marked with the same name returns `d`
 * itself, so History adds no undo step.
 */
export function markBuilt(d: StageDesign, name: string): StageDesign {
  const { fileHash } = d.source;
  if (d.source.kind === 'builder' && d.source.name === name) return d;
  const source: StageSource = fileHash === undefined ? { kind: 'builder', name } : { kind: 'builder', name, fileHash };
  return { ...d, source };
}
