import { clamp } from '../../core';
import { ATTR, type AttrName } from '../../domain/attributes';
import type { Rig } from '../../domain/rig';
import type { FixtureValues } from '../CueList';

/** One attribute value for one fixture, as the operator, a preset or a command sets it. */
export interface ValueChange {
  readonly id: number;
  readonly attr: AttrName;
  readonly value: number;
}

/**
 * Writes one programmer value into `vals`: clamped to the attribute's range (zoom to the fixture type's own range),
 * rounded to whole numbers for stepped attributes, then to two decimals. Unknown fixtures and attributes the fixture
 * lacks are ignored, because presets and commands apply the same values to mixed selections.
 */
export function setValue(vals: FixtureValues, rig: Rig, { id, attr, value }: ValueChange): void {
  const f = rig.get(id);
  if (!f?.has(attr)) return;
  const spec = ATTR[attr];
  const [min, max] = attr === 'zoom' ? f.T.zr : [spec.min, spec.max];
  let v = clamp(value, min, max);
  if (spec.step) v = Math.round(v);
  // the inner `+` is the original's: a hand-edited show can carry a string, which clamp passes through unchanged
  (vals[id] ??= {})[attr] = +(+v).toFixed(2); // quirk B3 (orig:1809): 2 decimals here, 1 in aimAt
}
