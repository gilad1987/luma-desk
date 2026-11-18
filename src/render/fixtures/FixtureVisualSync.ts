import type { Texture, Vector3 } from 'three';
import { clamp } from '../../core';
import type { AttrValues } from '../../domain/attributes';
import type { Selection } from '../../engine/Selection';
import type { LightFrame } from '../lights/LightFrame';
import type { SharedUniform } from './BeamMaterial';
import type { FixtureVisual, ScreenVisual } from './FixtureVisual';
import { hitSurface } from '../surface/hitSurface';
import { outputValue } from './sync/BeamFrame';
import { LightSync, type BeamSurface } from './sync/LightSync';
import { syncScreen, type ScreenTargets } from './sync/syncScreen';

/** Inputs of the frame update; the screen targets and the light frame come from venue and render core. */
export interface FixtureVisualSyncDeps {
  /** In fixture array order. */
  readonly visuals: readonly FixtureVisual[];
  readonly selection: Pick<Selection, 'has'>;
  /** The boot rig's one LED screen, driven by every screen fixture of `visuals`; a rebuild uses `setVisuals`. */
  readonly screen: ScreenTargets;
  /** The beams' shared haze-noise time. */
  readonly beamTime: SharedUniform;
  readonly goboTextures: readonly Texture[];
  /** Render core's per-frame light aggregate; the integrator feeds it to the scene and key lights after update. */
  readonly lights: LightFrame;
  /** Where beams land; without it, the venue's fixed surfaces (`hitSurface`). */
  readonly surface?: BeamSurface;
}

/** The strobe shutter: open 22 % of each period, at 1 to 23 Hz. */
function gatedIntensity(o: Readonly<AttrValues>, now: number): number {
  let intensity = clamp(outputValue(o, 'dim') / 100, 0, 1);
  const strobe = outputValue(o, 'strobe');
  if (strobe > 0.5) {
    const hz = 1 + (strobe / 100) * 22;
    intensity *= (now * hz) % 1 < 0.22 ? 1 : 0;
  }
  return intensity;
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
 * The visual list and the screen targets change on a rig rebuild ({@link setVisuals}); the rest stays.
 */
export class FixtureVisualSync {
  readonly #beamTime: SharedUniform;
  readonly #lights: LightFrame;
  readonly #light: LightSync;
  #visuals: readonly FixtureVisual[] = [];
  #screens: ReadonlyMap<number, ScreenTargets> = new Map();

  constructor(deps: FixtureVisualSyncDeps) {
    const { selection, goboTextures, lights, surface = { hit: hitSurface } } = deps;
    this.#beamTime = deps.beamTime;
    this.#lights = lights;
    this.#light = new LightSync({ selection, goboTextures, lights, surface });
    const screens = deps.visuals.filter((v) => v.kind === 'screen').map((v) => [v.fixture.id, deps.screen] as const);
    this.setVisuals(deps.visuals, new Map(screens));
  }

  /**
   * Replaces the visuals (fixture array order) and the targets of each screen fixture, by fixture id, after a rig
   * rebuild. @throws Error when a screen visual has no targets, before the old list is replaced.
   */
  setVisuals(visuals: readonly FixtureVisual[], screens: ReadonlyMap<number, ScreenTargets>): void {
    for (const v of visuals) if (v.kind === 'screen') targetsOf(screens, v);
    this.#visuals = visuals;
    this.#screens = screens;
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
        // the beam haze-noise time moves only with a screen, as in the legacy code: no screen, still haze
        this.#beamTime.value = now;
      } else this.#light.sync(v, o, intensity, dt);
    }
  }
}
