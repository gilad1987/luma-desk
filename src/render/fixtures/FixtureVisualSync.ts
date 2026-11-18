import type { Texture, Vector3 } from 'three';
import type { Selection } from '../../engine/Selection';
import type { LightFrame } from '../lights/LightFrame';
import type { SharedUniform } from './BeamMaterial';
import type { FixtureVisual, ScreenVisual } from './FixtureVisual';
import { gatedIntensity } from './sync/gatedIntensity';
import { LightSync, type BeamSurface } from './sync/LightSync';
import { syncScreen, type ScreenTargets } from './sync/syncScreen';

/** Inputs of the frame update; the visuals and their screen targets come later, through `setVisuals`. */
export interface FixtureVisualSyncDeps {
  readonly selection: Pick<Selection, 'has'>;
  /** The beams' shared haze-noise time. */
  readonly beamTime: SharedUniform;
  readonly goboTextures: readonly Texture[];
  /** Render core's per-frame light aggregate; the integrator feeds it to the scene and key lights after update. */
  readonly lights: LightFrame;
  /** Where beams land: the stage's `SurfaceHit`, which follows the current design and venue. */
  readonly surface: BeamSurface;
}

/** @throws Error when a screen fixture has no targets: its output would drive nothing. */
function targetsOf(screens: ReadonlyMap<number, ScreenTargets>, v: ScreenVisual): ScreenTargets {
  const targets = screens.get(v.fixture.id);
  if (!targets) throw new Error(`FixtureVisualSync: screen fixture ${v.fixture.id} has no screen targets`);
  return targets;
}

/**
 * Per-frame update of every fixture visual from the engine output (legacy `updateVisuals` up to the end of its
 * fixture loop). It resets and fills the render core light frame; render core turns it into the scene lights.
 * It starts with no visuals; the visual list and the screen targets come with each rig build ({@link setVisuals}).
 */
export class FixtureVisualSync {
  readonly #beamTime: SharedUniform;
  readonly #lights: LightFrame;
  readonly #light: LightSync;
  #visuals: readonly FixtureVisual[] = [];
  #screens: ReadonlyMap<number, ScreenTargets> = new Map();
  #hasScreen = false;

  constructor(deps: FixtureVisualSyncDeps) {
    const { selection, goboTextures, lights, surface } = deps;
    this.#beamTime = deps.beamTime;
    this.#lights = lights;
    this.#light = new LightSync({ selection, goboTextures, lights, surface });
  }

  /**
   * Replaces the visuals (fixture array order) and the targets of each screen fixture, by fixture id, after a rig
   * rebuild. @throws Error when a screen visual has no targets, before the old list is replaced.
   */
  setVisuals(visuals: readonly FixtureVisual[], screens: ReadonlyMap<number, ScreenTargets>): void {
    for (const v of visuals) if (v.kind === 'screen') targetsOf(screens, v);
    this.#visuals = visuals;
    this.#screens = screens;
    this.#hasScreen = visuals.some((v) => v.kind === 'screen');
  }

  /** `now` and `dt` in seconds; `cameraPosition` places the lens glow flares. */
  update(now: number, dt: number, cameraPosition: Vector3): void {
    this.#light.camera.copy(cameraPosition);
    this.#lights.reset();
    for (const v of this.#visuals) {
      const o = v.fixture.out,
        intensity = gatedIntensity(o, now);
      if (v.kind === 'screen') {
        syncScreen(targetsOf(this.#screens, v), o, intensity, now);
        // the legacy code moved the beam haze-noise time in the screen branch; the built-in rig keeps that order
        this.#beamTime.value = now;
      } else this.#light.sync(v, o, intensity, dt);
    }
    // a rig without a screen (theatre, empty) would otherwise freeze the haze
    if (!this.#hasScreen) this.#beamTime.value = now;
  }
}
