import type { StageDesign } from '../../domain/stage/StageDesign';
import type { MvrGeometry } from '../../mvr/index';
import type { CameraViews } from '../../render/camera/CameraViews';
import { mvrCameraBounds } from '../../render/mvr/mvrCameraBounds';
import { mvrSurfaces } from '../../render/mvr/mvrSurfaces';
import { mvrViews } from '../../render/mvr/mvrViews';
import type { SurfaceHit } from '../../render/surface/SurfaceHit';

/** The camera views as the MVR fit uses them: fit the table, then move to the current view. */
export type FittedViews = Pick<CameraViews, 'fitTo' | 'setView' | 'currentView'>;

/** The desk render that a shown MVR scenery adds to: the camera views and the boxes beams land on. */
export interface MvrDeskRender {
  readonly views: FittedViews;
  readonly surfaceHit: Pick<SurfaceHit, 'setSurfaces' | 'setVenue'>;
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
  #design: StageDesign | undefined;

  constructor(render: MvrDeskRender) {
    this.#render = render;
  }

  /** Remembers the scenery of a drawn show and fits the views and beam surfaces to it and its design. */
  fit(design: StageDesign, geometry: MvrGeometry): void {
    this.#geometry = geometry;
    this.refit(design);
  }

  /**
   * Fits the views to the stage box and its framing views (`mvrViews`), and the surfaces to the shown meshes, of the
   * remembered scenery and `design`; nothing to do while no scenery is shown.
   */
  refit(design: StageDesign): void {
    if (!this.#geometry) return;
    this.#design = design;
    const { views, surfaceHit } = this.#render;
    surfaceHit.setVenue(design.venue.kind);
    surfaceHit.setSurfaces(mvrSurfaces(design, this.#geometry));
    const box = mvrCameraBounds(design, this.#geometry);
    views.fitTo(
      box,
      mvrViews(
        box,
        design.fixtures.map((fixture) => fixture.position),
      ),
    );
    views.setView(views.currentView);
  }

  /**
   * Fits again for other hidden layers: a layer toggle in the import summary changes the stage box and the shown
   * meshes, but only updates the design's meta, so no stage rebuild calls `refit`.
   */
  hide(hiddenLayers: readonly string[]): void {
    const design = this.#design;
    if (design?.mvr) this.refit({ ...design, mvr: { ...design.mvr, hiddenLayers } });
  }

  /** Drops the scenery, so a later refit does nothing; the next stage's rebuild sets its views and surfaces itself. */
  forget(): void {
    this.#geometry = undefined;
    this.#design = undefined;
  }
}
