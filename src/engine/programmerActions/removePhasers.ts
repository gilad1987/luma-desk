import type { Feature } from '../../domain/attributes';
import type { Programmer } from '../Programmer';
import { compactFx, stripFx } from '../shared';

/**
 * Takes `ids` out of every phaser, or only out of those that drive `feat`, then drops emptied phasers. Without `feat`
 * it is the "Remove Phasers" button.
 */
export function removePhasers(p: Programmer, ids: readonly number[], feat?: Feature): void {
  stripFx(p.fxList, ids, feat);
  p.fxList = compactFx(p.fxList);
  p.reindexFx();
}
