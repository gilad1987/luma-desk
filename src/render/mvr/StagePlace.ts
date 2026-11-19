import type { StageDeck } from '../../domain/stage/StageDesign';
import type { StageBounds } from '../../domain/stage/types';

/**
 * Where the performers and the public of an imported stage are: the stage box without the seats, the deck of the
 * design, and the box of the drawn seats when the file has any. Plain data, so the views are pure functions of it.
 */
export interface StagePlace {
  readonly stage: StageBounds;
  readonly deck?: StageDeck;
  readonly seats?: StageBounds;
  /** How many fixtures of the file stand far from `stage` (`rigCluster`); absent means none was counted. */
  readonly outliers?: number;
  /** How many drawn seats and panels stand far from `stage` and `seats` (`seatCluster`); absent means none counted. */
  readonly farProxies?: number;
  /** The world z of the house side of what the On Stage eye stands in front of (`stageBackdrop`). */
  readonly backdrop?: number;
  /**
   * The boxes of everything drawn that an eye must not stand in or behind (`clearEye`): the file meshes, the seat
   * and panel proxies and the fixture bodies. The hall the desk makes is not among them: the eye may be in it.
   */
  readonly obstacles?: readonly StageBounds[];
  /** True for a file without fixtures: its screens are the stage, and On Stage looks at them, not out from them. */
  readonly isScreensOnly?: boolean;
}
