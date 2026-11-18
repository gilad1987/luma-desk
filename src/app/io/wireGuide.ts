import { defaultPoolOf } from '../../engine/stage/defaultPool';
import type { RigSource } from '../../engine/stage/RigSource';
import type { GuideFlag } from '../../show';
import { bindGuideEscape } from '../../ui/guide/bindGuideEscape';
import { Guide } from '../../ui/guide/Guide';
import { Tour } from '../../ui/guide/Tour';
import type { SideTabs } from '../../ui/panels/side/SideTabs';
import { createTourHooks } from './createTourHooks';

/** What the guide and the tour read from main.ts. */
export interface GuideWiringDeps {
  /** The rig chapter lists the default groups of the current stage, built fresh at each render as the original did. */
  readonly stage: Pick<RigSource, 'rig' | 'design' | 'isBuiltIn'>;
  /** The tour switches side panes through the same tab bar the layouts use. */
  readonly sideTabs: Pick<SideTabs, 'show'>;
  /** Whether the MA layout is on (`deskMode === 'ma'`); the layout area owns `deskMode`. */
  readonly isMa: () => boolean;
  /** main.ts `guideFlag`: closing the guide marks it seen, and the first-run open asks it. */
  readonly guideFlag: Pick<GuideFlag, 'seen' | 'markSeen'>;
}

/** The guide overlay and the tour, which other areas open or ask. */
export interface GuideHandles {
  /** `#helpBtn` opens it, the key handlers ask `isOpen()`, the first-run check calls `openOnFirstRun()`. */
  readonly guide: Guide;
  /** The page key handler asks `isActive()`. */
  readonly tour: Tour;
}

/**
 * Builds the user guide and the guided tour and binds Escape (keydown listener K3, capture on `document`). It runs
 * before the fullscreen wiring so K3 is registered before K4, the other `document` capture listener, as in the legacy
 * page. That order is kept for parity only: the two listeners never act on the same key. Nothing opens here; the
 * first-run open is a separate call (`guide.openOnFirstRun()`) at the end of boot.
 */
export function wireGuide(deps: GuideWiringDeps): GuideHandles {
  const hooks = createTourHooks(deps.sideTabs, deps.isMa);
  const guide = new Guide(
    () => defaultPoolOf(deps.stage),
    () => tour.start(),
    deps.guideFlag,
  );
  const tour = new Tour(hooks);
  bindGuideEscape(guide, tour);
  return { guide, tour };
}
