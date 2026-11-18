import { requireChild } from '../../ui/dom';
import type { TourHooks } from '../../ui/guide/tourTargets';
import type { SideTabs } from '../../ui/panels/side/SideTabs';

/**
 * The tour's view switches. A side switch goes through {@link SideTabs.show} (the legacy `sideTo`), the one place that
 * skips Pools in the MA layout. A feature switch clicks the real tab button so the tab's own handler runs (the legacy
 * `featTo`). `isMa` comes from the layout's `deskMode` and picks the tour's MA step texts.
 */
export function createTourHooks(sideTabs: Pick<SideTabs, 'show'>, isMa: () => boolean): TourHooks {
  return {
    showSide: (tab) => sideTabs.show(tab),
    showFeature(feature: string): void {
      requireChild(document, `#featTabs [data-f=${feature}]`).click();
    },
    isMa,
  };
}
