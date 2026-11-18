import { FEAT_ATTRS, type Feature } from '../../domain/attributes';
import type { Programmer } from '../Programmer';

/**
 * Knockout: drops the values of feature `feat` for `ids`, deletes a fixture's entry once it is empty, and takes `ids`
 * out of the phasers that drive `feat`, so the executors show through again.
 */
export function removeFeature(p: Programmer, ids: readonly number[], feat: Feature): void {
  for (const id of ids) {
    const v = p.vals[id];
    if (!v) continue;
    for (const a of FEAT_ATTRS[feat]) delete v[a];
    if (!Object.keys(v).length) delete p.vals[id];
  }
  p.removePhasers(ids, feat);
}
