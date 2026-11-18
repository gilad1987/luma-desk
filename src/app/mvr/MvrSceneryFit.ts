import type { StageDesign } from '../../domain/stage/StageDesign';
import type { MvrGeometry } from '../../mvr/index';
import type { CameraViews } from '../../render/camera/CameraViews';
import { mvrCameraBounds } from '../../render/mvr/mvrCameraBounds';
import { mvrSurfaces } from '../../render/mvr/mvrSurfaces';
import type { SurfaceHit } from '../../render/surface/SurfaceHit';

/** The camera views as the MVR fit uses them: fit the table, then move to the current view. */
export type FittedViews = Pick<CameraViews, 'fitTo' | 'setView' | 'currentView'>;

/** The desk render that a shown MVR scenery adds to: the camera views and the boxes beams land on. */
export interface MvrDeskRender {
  readonly views: FittedViews;
  readonly surfaceHit: Pick<SurfaceHit, 'setSurfaces'>;
}

/**
 * The one owner of what a shown MVR scenery adds to the desk render: the camera views fitted to the scenery and the
 * scenery's mesh tops as beam surfaces. A stage rebuild sets both from the design only, and an MVR venue often reaches
 * far past the deck, so the scenery side keeps its geometry and applies both again after every rebuild that keeps it
 * (a builder edit, a show load of the same file). A rebuild for another stage sets the design's own again.
 */
export class MvrSceneryFit {
  readonly #render: MvrDeskRender;
  #geometry: MvrGeometry | undefined;

  constructor(render: MvrDeskRender) {
    this.#render = render;
  }

  /** Remembers the scenery of a drawn show and fits the views and beam surfaces to it and its design. */
  fit(design: StageDesign, geometry: MvrGeometry): void {
    this.#geometry = geometry;
    this.refit(design);
  }

  /** Fits the views and surfaces to the remembered scenery and `design`; nothing to do while no scenery is shown. */
  refit(design: StageDesign): void {
    if (!this.#geometry) return;
    const { views, surfaceHit } = this.#render;
    surfaceHit.setSurfaces(mvrSurfaces(design, this.#geometry), design.venue.kind);
    views.fitTo(mvrCameraBounds(design, this.#geometry));
    views.setView(views.currentView);
  }

  /** Drops the scenery, so a later refit does nothing; the next stage's rebuild sets its views and surfaces itself. */
  forget(): void {
    this.#geometry = undefined;
  }
}
