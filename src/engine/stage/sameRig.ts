import { isSameData } from '../../domain/stage/sameData';
import type { StageDesign } from '../../domain/stage/StageDesign';

/**
 * True when two designs give the same rig and differ at most in data `StageService.updateMeta` may change (today the
 * MVR `hiddenLayers` and `ledLayers`, which are the user's view of the layers). updateMeta uses it to refuse a design that needs a rig rebuild, so it never skips `rigChanged`.
 */
export function isSameRig(a: StageDesign, b: StageDesign): boolean {
  return isSameData(rigData(a), rigData(b));
}

/** The design with the data `updateMeta` may change taken out, so the rest can be compared. */
function rigData(design: StageDesign): StageDesign {
  return design.mvr ? { ...design, mvr: { ...design.mvr, hiddenLayers: [], ledLayers: [] } } : design;
}
