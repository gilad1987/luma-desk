import type { Scene, WebGLRenderer } from 'three';
import type { StageDesign } from '../../domain/stage/StageDesign';
import { CameraViews } from '../../render/camera/CameraViews';
import { isViewName, type ViewName } from '../../render/camera/viewTable';
import { addEnvironmentLights } from '../../render/lights/addEnvironmentLights';
import { SceneLights } from '../../render/lights/SceneLights';
import { createStageGraphics } from '../../render/stage/createStageGraphics';
import { PostFx } from '../../render/stage/PostFx';
import { StageScene } from '../../render/stage/StageScene';
import { SurfaceHit } from '../../render/surface/SurfaceHit';
import { buildVenue, type Venue } from '../../render/venue/Venue';
import { byId } from '../../ui/dom';

/** The renderer, camera and venue: everything the fixture visuals hang in. */
export interface StageHandles {
  readonly canvas: HTMLCanvasElement;
  readonly renderer: WebGLRenderer;
  readonly scene: Scene;
  readonly views: CameraViews;
  readonly camera: CameraViews['camera'];
  readonly controls: CameraViews['controls'];
  /** Moves the camera; the view buttons and the test hook pass plain strings, so an unknown name does nothing. */
  readonly setView: (view: string, instant?: boolean) => void;
  readonly postFx: PostFx;
  readonly venue: Venue;
  readonly sceneLights: SceneLights;
  /** The stage parts of the current design; it rebuilds them and the fixture visuals on `rigChanged`. */
  readonly stageScene: StageScene;
  /** Where beams land; the stage scene sets its surfaces once per build. */
  readonly surfaceHit: SurfaceHit;
}

/** Lights the `[data-view]` button of the current view, as the top bar showed it before any area owned it. */
function markViewButtons(view: ViewName): void {
  for (const button of document.querySelectorAll<HTMLElement>('[data-view]')) {
    button.classList.toggle('on', button.dataset['view'] === view);
  }
}

/**
 * Creates the stage in the legacy order. three.js draws each object's uuid from the seeded Math.random, so this
 * order is render parity (decision 24): change it only with an approved screenshot baseline. `design` is the boot
 * stage; its parts are built inside the venue build, where the legacy scene built them.
 */
export function wireStage(design: StageDesign): StageHandles {
  const canvas = byId('c', HTMLCanvasElement);
  const { renderer, scene } = createStageGraphics(canvas);
  // MA layout: FOH is the operator's standing eye at the control position in the audience, behind the console
  // overlay; the scene's raised FOH riser and its desk are hidden there (they would show as a second, empty desk)
  const views = new CameraViews(canvas, {
    isMaLayout: () => document.body.classList.contains('ma'),
    onViewChanged: markViewButtons,
  });
  const setView = (view: string, instant?: boolean): void => {
    if (isViewName(view)) views.setView(view, instant);
  };
  setView('foh', true);
  const postFx = new PostFx(renderer, scene, views.camera);
  addEnvironmentLights(scene);
  const surfaceHit = new SurfaceHit();
  const stageScene = new StageScene({ scene, surfaces: surfaceHit, views }, design);
  const venue = buildVenue(scene, stageScene);
  const sceneLights = new SceneLights(scene, venue.wallFloodlight);
  const { camera, controls } = views;
  return {
    canvas,
    renderer,
    scene,
    views,
    camera,
    controls,
    setView,
    postFx,
    venue,
    sceneLights,
    stageScene,
    surfaceHit,
  };
}
