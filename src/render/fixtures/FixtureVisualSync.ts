import { Vector3, type Texture } from 'three';
import { clamp, D2R } from '../../core';
import type { AttrValues } from '../../domain/attributes';
import type { Selection } from '../../engine/Selection';
import type { LightFrame } from '../lights/LightFrame';
import type { SharedUniform } from './BeamMaterial';
import type { FixtureVisual, LightVisual } from './FixtureVisual';
import { hitSurface } from '../surface/hitSurface';
import { outputValue, type BeamFrameSlot } from './sync/BeamFrame';
import { gatedIntensity } from './sync/gatedIntensity';
import { syncBeam } from './sync/syncBeam';
import { syncGlow } from './sync/syncGlow';
import { syncLens } from './sync/syncLens';
import { syncPool } from './sync/syncPool';
import { syncPose } from './sync/syncPose';
import { syncScreen, type ScreenTargets } from './sync/syncScreen';

/** Inputs of the frame update; the screen targets and the light frame come from venue and render core. */
export interface FixtureVisualSyncDeps {
  /** In fixture array order. */
  readonly visuals: readonly FixtureVisual[];
  readonly selection: Pick<Selection, 'has'>;
  readonly screen: ScreenTargets;
  /** The beams' shared haze-noise time. */
  readonly beamTime: SharedUniform;
  readonly goboTextures: readonly Texture[];
  /** Render core's per-frame light aggregate; the integrator feeds it to the scene and key lights after update. */
  readonly lights: LightFrame;
}

/**
 * Per-frame update of every fixture visual from the engine output (legacy `updateVisuals` up to the end of its
 * fixture loop). It resets and fills the render core light frame; render core turns it into the scene lights.
 */
export class FixtureVisualSync {
  readonly #deps: FixtureVisualSyncDeps;
  readonly #camera = new Vector3();
  readonly #dir = new Vector3();
  readonly #origin = new Vector3();
  /** The fixture colour, 0..1, refilled per fixture; a step that keeps it past the fixture's sync copies it. */
  readonly #col: [number, number, number] = [0, 0, 0];
  /** The beam carrier, made by the first lit fixture and refilled for every later one. */
  #frame: BeamFrameSlot | null = null;

  constructor(deps: FixtureVisualSyncDeps) {
    this.#deps = deps;
  }

  /** `now` and `dt` in seconds; `cameraPosition` places the lens glow flares. */
  update(now: number, dt: number, cameraPosition: Vector3): void {
    this.#camera.copy(cameraPosition);
    this.#deps.lights.reset();
    for (const v of this.#deps.visuals) {
      const o = v.fixture.out,
        intensity = gatedIntensity(o, now);
      if (v.kind === 'screen') {
        syncScreen(this.#deps.screen, o, intensity, now);
        // the beam haze-noise time moves only with a screen, as in the legacy code: no screen, still haze
        this.#deps.beamTime.value = now;
      } else this.#syncLight(v, o, intensity, dt);
    }
  }

  #syncLight(v: LightVisual, o: Readonly<AttrValues>, intensity: number, dt: number): void {
    const deps = this.#deps,
      f = v.fixture,
      spec = f.T,
      dir = this.#dir,
      col = this.#col;
    syncPose(v, o, dt, dir);
    col[0] = outputValue(o, 'r') / 100;
    col[1] = outputValue(o, 'g') / 100;
    col[2] = outputValue(o, 'b') / 100;
    v.bodyMat.emissive.setHex(deps.selection.has(f.id) ? 0x7a5a00 : 0x000000);
    syncLens(v, col, intensity);
    const on = intensity > 0.004;
    v.beam.visible = v.pool.visible = v.glow.visible = on;
    if (!on) return;
    const origin = this.#origin.copy(f.pos).addScaledVector(dir, v.lensOff + 0.02);
    const zoom = clamp(outputValue(o, 'zoom'), spec.zr[0], spec.zr[1]),
      tz = Math.tan((zoom / 2) * D2R);
    const hit = hitSurface(origin, dir),
      length = hit ? hit.t : 85;
    // col, dir and origin are this sync's own buffers, so the carrier keeps them from its first fill
    const frame = (this.#frame ??= { visual: v, o, intensity, col, dir, origin, zoom, tz, hit, length });
    frame.visual = v;
    frame.o = o;
    frame.intensity = intensity;
    frame.zoom = zoom;
    frame.tz = tz;
    frame.hit = hit;
    frame.length = length;
    const gob = syncBeam(frame);
    syncPool(frame, gob, deps.goboTextures, deps.lights);
    if (f.type === 'blinder') deps.lights.addBlinder(intensity);
    syncGlow(frame, this.#camera);
  }
}
