import type { AttrValues, Feature } from '../domain/attributes';
import { FEAT_ATTRS } from '../domain/attributes';

/**
 * The values of `v` that belong to `feats`, in feature order; unset and null values are left out. Storing a preset
 * records only the features of its pool, so a Color preset never carries a pan.
 */
export function featureValues(v: AttrValues, feats: readonly Feature[]): AttrValues {
  const o: AttrValues = {};
  for (const ft of feats) for (const a of FEAT_ATTRS[ft]) if (v[a] != null) o[a] = v[a];
  return o;
}
