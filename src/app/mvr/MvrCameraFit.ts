import type { StageDesign } from '../../domain/stage/StageDesign';
import type { MvrGeometry } from '../../mvr/index';
import type { CameraViews } from '../../render/camera/CameraViews';
import { mvrCameraBounds } from '../../render/mvr/mvrCameraBounds';

/** The camera views as the MVR fit uses them: fit the table, then move to the current view. */
export type FittedViews = Pick<CameraViews, 'fitTo' | 'setView' | 'currentView'>;

/**
 * Fits the camera views to the shown MVR scenery joined with the design. A stage rebuild fits the views to the
 * design only, and an MVR venue often reaches far past the deck, so the scenery side keeps its geometry and fits
 * again after every rebuild that keeps it (a builder edit, a show load of the same file).
 */
export class MvrCameraFit {
  readonly #views: FittedViews;
  #geometry: MvrGeometry | undefined;

  constructor(views: FittedViews) {
    this.#views = views;
  }

  /** Remembers the scenery of a drawn show and fits the views to it and its design. */
  fit(design: StageDesign, geometry: MvrGeometry): void {
    this.#geometry = geometry;
    this.refit(design);
  }

  /** Fits the views to the remembered scenery and `design`; nothing to do while no scenery is shown. */
  refit(design: StageDesign): void {
    if (!this.#geometry) return;
    this.#views.fitTo(mvrCameraBounds(design, this.#geometry));
    this.#views.setView(this.#views.currentView);
  }

  /** Drops the scenery, so a later refit does nothing; the next stage's rebuild fits the views itself. */
  forget(): void {
    this.#geometry = undefined;
  }
}
