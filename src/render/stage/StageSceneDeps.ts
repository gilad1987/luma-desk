import type { Object3D, PointLight } from 'three';
import type { CameraViews } from '../camera/CameraViews';
import type { FixtureVisuals } from '../fixtures/FixtureVisuals';
import type { SurfaceHit } from '../surface/SurfaceHit';
import type { FixtureIdOverlay } from './FixtureIdOverlay';

/** The scene the parts go in, where beams land, and the camera views a new stage refits and a venue joins its FOH. */
export interface StageSceneDeps {
  readonly scene: Object3D;
  readonly surfaces: Pick<SurfaceHit, 'setSurfaces' | 'setVenue'>;
  readonly views: Pick<CameraViews, 'fitTo' | 'setView' | 'currentView' | 'fohRig'>;
}

/**
 * The fixture side a stage hands its rig to: the visuals, the id overlay and the screens' spill light. It joins the
 * stage at boot, after the venue built the walls the screen fixtures need.
 */
export interface StageFixtureHost {
  /** `assertBuildable` lets a rebuild refuse a rig before it frees the old stage. */
  readonly visuals: Pick<FixtureVisuals, 'assertBuildable' | 'rebuild'>;
  readonly overlay: Pick<FixtureIdOverlay, 'setFixtures'>;
  readonly screenLight: PointLight;
}
