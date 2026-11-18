import type { Rig } from '../../domain/rig';
import { defaultGroups } from '../../engine/defaultGroups';
import { bindGuideEscape } from '../../ui/guide/bindGuideEscape';
import { Guide } from '../../ui/guide/Guide';
import { Tour } from '../../ui/guide/Tour';
import type { TourHooks } from '../../ui/guide/tourTargets';
import { createTourHooks } from './createTourHooks';

/** What the guide and the tour read from main.ts. */
export interface GuideWiringDeps {
  /** The rig chapter lists the default groups of this rig, built fresh at each render as the original did. */
  readonly rig: Rig;
  /** Whether the MA layout is on (`deskMode === 'ma'`); the layout area owns `deskMode`. */
  readonly isMa: () => boolean;
}

/** The guide overlay, the tour and the tab switches other areas call. */
export interface GuideHandles {
  /** `#helpBtn` opens it, the key handlers ask `isOpen()`, the first-run check calls `openOnFirstRun()`. */
  readonly guide: Guide;
  /** The page key handler asks `isActive()`. */
  readonly tour: Tour;
  /** `hooks.showSide` replaces the legacy `sideTo`, which the layout area calls too. */
  readonly hooks: TourHooks;
}

/**
 * Builds the user guide and the guided tour and binds Escape (keydown listener K3, capture on `document`). It must run
 * before the fullscreen wiring: K4 is the other `document` capture listener and is registered after K3, as before.
 * Nothing opens here; the first-run open is a separate call (`guide.openOnFirstRun()`) at the end of boot.
 */
export function wireGuide(deps: GuideWiringDeps): GuideHandles {
  const hooks = createTourHooks(deps.isMa);
  const guide = new Guide(
    () => defaultGroups(deps.rig),
    () => tour.start(),
  );
  const tour = new Tour(hooks);
  bindGuideEscape(guide, tour);
  return { guide, tour, hooks };
}
