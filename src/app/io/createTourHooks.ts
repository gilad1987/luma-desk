import { requireChild } from '../../ui/dom';
import type { SideTab } from '../../ui/panels/side/sideTabsMarkup';
import type { TourHooks } from '../../ui/guide/tourTargets';

/**
 * The tour's view switches, done by clicking the real tab buttons so the tabs' own handlers run (the legacy `sideTo`
 * and `featTo`). The MA layout keeps the pools on its own screen, so a switch to `pools` is skipped there. The layout
 * area also needs `showSide` when it changes layout; `isMa` comes from the layout's `deskMode`.
 */
export function createTourHooks(isMa: () => boolean): TourHooks {
  return {
    showSide(tab: SideTab): void {
      if (tab !== 'pools' || !isMa()) requireChild(document, `#sideTabs [data-t=${tab}]`).click();
    },
    showFeature(feature: string): void {
      requireChild(document, `#featTabs [data-f=${feature}]`).click();
    },
    isMa,
  };
}
