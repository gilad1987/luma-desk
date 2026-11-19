import { Vector3 } from 'three';
import type { Rgb01 } from '../../../core';
import type { ProductId } from '../../../domain/fixtureProducts';
import { syncLens } from '../sync/syncLens';
import { syncPose } from '../sync/syncPose';
import { frameGalleryView } from './galleryCamera';
import { buildGalleryPair } from './galleryPair';
import type { GalleryParams } from './galleryParams';
import { createGalleryStudio, type GalleryStudio } from './galleryStudio';
import { measureVisible } from './measureVisible';

/** Full white, the colour a lit lens shows at full intensity. */
const WHITE: Rgb01 = [1, 1, 1];
/** A pose step this long settles the movers' 1/9 s easing exactly, so the joints show the requested angles. */
const POSE_SETTLE_S = 60;
/** The side view turns the bodies a quarter turn and keeps the camera near the front, so the pair stays apart. */
const SIDE_TURN = Math.PI / 2;

/**
 * The dev-only fixture gallery: one product next to its native base model in a neutral studio, so a product's body
 * can be checked in close-up. It reuses the desk's lens and pose sync and owns no state the desk reads; it is not
 * part of the build (`vite build` builds `index.html` only).
 */
export class GalleryScene {
  readonly #studio: GalleryStudio;

  constructor(canvas: HTMLCanvasElement) {
    this.#studio = createGalleryStudio(canvas);
  }

  /**
   * Builds the pair of `product`, lights and poses it as `params` say, and frames the camera on it. A moving head
   * always takes the pose on its joints; a static light takes a non-rest pose by its pivot, as the desk focuses it
   * (tilt 90 turns its head level to the audience, so its front face shows).
   */
  show(product: ProductId, params: GalleryParams): void {
    const { scene, camera, controls } = this.#studio;
    const pair = buildGalleryPair(scene, product, params.view === 'side' ? SIDE_TURN : 0);
    const dir = new Vector3();
    const isPosed = params.pan !== 0 || params.tilt !== 0;
    for (const v of pair.visuals) {
      syncLens(v, WHITE, params.isLit ? 1 : 0);
      if (v.fixture.T.moving || isPosed) syncPose(v, { pan: params.pan, tilt: params.tilt }, POSE_SETTLE_S, dir);
    }
    pair.hung.visible = params.view !== 'floor';
    pair.floor.visible = params.view !== 'below';
    frameGalleryView(camera, controls, measureVisible(pair.root), params.view);
  }

  /** Starts drawing; `onFirstFrame` runs on the second frame, once the first one is on screen. */
  start(onFirstFrame: () => void): void {
    const { renderer, scene, camera, controls } = this.#studio;
    let frames = 0;
    void renderer.setAnimationLoop(() => {
      controls.update();
      renderer.render(scene, camera);
      frames += 1;
      if (frames === 2) onFirstFrame();
    });
  }
}
