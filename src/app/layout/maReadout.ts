import type { MaReadoutSource } from '../../ui/layouts/ma/MaReadoutSource';
import type { LayoutDeps } from './LayoutDeps';

/**
 * What the MA touch screens read: the selected fixtures and the old `curVal` (programmer value, else the base value).
 * A value neither has reads as NaN, which is what the old `undefined` became in every sum and `Math.round`.
 */
export function maReadout({
  selection,
  stage,
  programmer,
}: Pick<LayoutDeps, 'selection' | 'stage' | 'programmer'>): MaReadoutSource {
  return {
    selectedIds: () => selection.ids,
    fixture: (id) => {
      const fixture = stage.rig.get(id);
      // the selection only holds rig ids; the old `FX[id]` had no fallback either
      if (!fixture) throw new Error(`maReadout.fixture: fixture ${id} is not in the rig`);
      return fixture;
    },
    value: (fixture, attr) => programmer.vals[fixture.id]?.[attr] ?? fixture.base[attr] ?? NaN,
  };
}
