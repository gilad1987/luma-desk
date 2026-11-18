import type { SideTab } from '../panels/side/sideTabsMarkup';

/** What a tour step may change before it measures its target: the side tab, the feature tab, the layout in use. */
export interface TourHooks {
  showSide(tab: SideTab): void;
  showFeature(feature: string): void;
  isMa(): boolean;
}

/** The element a tour step points at and the view it needs first; paired by index with `he.tour.steps`. */
export interface TourTarget {
  readonly selector: string;
  readonly before?: (h: TourHooks) => void;
}

/** The tour targets in step order. */
export const TOUR_TARGETS: readonly TourTarget[] = [
  { selector: '#viewer' },
  { selector: '#top .tbg' },
  { selector: '#house' },
  { selector: '#haze' },
  { selector: '#groupPool', before: (h) => h.showSide('pools') },
  { selector: '#presetPool', before: (h) => h.showSide('pools') },
  { selector: '#featTabs', before: (h) => h.showFeature('pos') },
  { selector: '#encoders' },
  { selector: '#encExtra' },
  { selector: '.cmdrow' },
  { selector: '#kStore' },
  { selector: '#kClear' },
  { selector: '#execs' },
  { selector: '#goBig' },
  { selector: '#gmFader' },
  { selector: '#sideTabs [data-t=auto]', before: (h) => h.showSide('auto') },
  { selector: '#helpBtn', before: (h) => h.showSide(h.isMa() ? 'sheet' : 'pools') },
];
