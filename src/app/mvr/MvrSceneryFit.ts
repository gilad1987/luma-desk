import type { Object3D } from 'three';
import type { StageDesign } from '../../domain/stage/StageDesign';
import type { MvrGeometry } from '../../mvr/index';
import type { CameraViews } from '../../render/camera/CameraViews';
import { mvrCameraBounds } from '../../render/mvr/mvrCameraBounds';
import { mvrStagePlace } from '../../render/mvr/mvrStagePlace';
import { mvrSurfaces } from '../../render/mvr/mvrSurfaces';
import { mvrViews } from '../../render/mvr/mvrViews';
import type { MvrHall } from '../../render/lights/MvrHall';
import type { SurfaceHit } from '../../render/surface/SurfaceHit';

/** The camera views as the MVR fit uses them: fit the table, then move to the current view. */
export type FittedViews = Pick<CameraViews, 'fitTo' | 'setView' | 'currentView'>;

/** The desk render that a shown MVR scenery adds to: the camera views and the boxes beams land on. */
export interface MvrDeskRender {
  readonly views: FittedViews;
  readonly surfaceHit: Pick<SurfaceHit, 'setSurfaces' | 'setVenue' | 'setScenery'>;
  /**
   * The hall light, placed over the camera box of the scenery. Only placed here: whether it is on follows the stage
   * kind (`followStage`), so a scenery that never loads (no stored file, a failed chunk) still gets the hall.
   */
  readonly sceneLights: { readonly hall: Pick<MvrHall, 'place'> };
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

  /**
   * Remembers the scenery of a drawn show and fits the views and beam surfaces to it and its design. `meshes` is the
   * built scenery group: beams land on its triangles, which are read once here.
   */
  fit(design: StageDesign, geometry: MvrGeometry, meshes: Object3D): void {
    this.#geometry = geometry;
    this.#render.surfaceHit.setScenery(meshes);
    this.refit(design);
  }

  /**
   * `fit`, then the desk's audience on the seat proxies of `meshes`, after the beam surfaces were read: beams land on
   * seats as before. A stage change while the chunk loads wins; a chunk that does not load leaves the file's scenery.
   */
  async fitSeated(design: StageDesign, geometry: MvrGeometry, meshes: Object3D): Promise<void> {
    this.fit(design, geometry, meshes);
    const audience = await import('../../render/venue/audience/addAudience').catch(() => undefined);
    if (this.#geometry === geometry) audience?.addAudience(meshes);
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
    surfaceHit.setSurfaces(mvrSurfaces(design));
    const box = mvrCameraBounds(design, this.#geometry);
    this.#render.sceneLights.hall.place(box, this.#geometry.hallLayers, design.mvr?.hiddenLayers);
    views.fitTo(
      box,
      mvrViews(
        box,
        design.fixtures.map((fixture) => fixture.position),
        mvrStagePlace(design, this.#geometry),
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
    // the hall and the title stay: they follow the stage kind (`followStage`), which a dropped scenery does not change
    if (this.#geometry) this.#render.surfaceHit.setScenery(null);
    this.#geometry = undefined;
    this.#design = undefined;
  }
}
