import type { StageDesign } from '../StageDesign';

/**
 * Marks a design as the user's own build, so a saved show records that its stage came from the builder and not from
 * a template or an MVR file. The source is replaced whole: an MVR `fileHash` names the original file, which an edited
 * stage no longer equals. A design already marked with the same name returns `d` itself, so History adds no undo step.
 */
export function markBuilt(d: StageDesign, name: string): StageDesign {
  if (d.source.kind === 'builder' && d.source.name === name && d.source.fileHash === undefined) return d;
  return { ...d, source: { kind: 'builder', name } };
}
