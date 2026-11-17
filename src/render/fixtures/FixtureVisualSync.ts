import { Vector3, type Texture } from 'three';
import { clamp, D2R } from '../../core';
import type { AttrValues } from '../../domain/attributes';
import type { Selection } from '../../engine/Selection';
import type { LightFrame, RgbTriple } from '../SceneLightsFrame';
import type { SharedUniform } from './BeamMaterial';
import type { FixtureVisual, LightVisual } from './FixtureVisual';
import { outputValue, type SurfaceHitFn, type SurfaceNormals } from './sync/BeamFrame';
import { syncBeam } from './sync/syncBeam';
import { syncGlow } from './sync/syncGlow';
import { syncPool } from './sync/syncPool';
import { syncPose } from './sync/syncPose';
import { syncScreen, type ScreenTargets } from './sync/syncScreen';

/** Inputs of the frame update; the hit function, its normals and the screen targets come from venue and render core. */
export interface FixtureVisualSyncDeps {
  /** In fixture array order. */
  readonly visuals: readonly FixtureVisual[];
  readonly selection: Pick<Selection, 'has'>;
  readonly hitSurface: SurfaceHitFn;
  readonly normals: SurfaceNormals;
  readonly screen: ScreenTargets;
  /** The beams' shared haze-noise time. */
  readonly beamTime: SharedUniform;
  readonly goboTextures: readonly Texture[];
  /** Render core's per-frame light aggregate; the integrator feeds it to the scene and key lights after update. */
  readonly lights: LightFrame;
}

/** The strobe shutter: open 22 % of each period, at 1 to 23 Hz. */
function gatedIntensity(o: Readonly<AttrValues>, now: number): number {
  let I = clamp(outputValue(o, 'dim') / 100, 0, 1);
  const strobe = outputValue(o, 'strobe');
  if (strobe > 0.5) {
    const hz = 1 + (strobe / 100) * 22;
    I *= (now * hz) % 1 < 0.22 ? 1 : 0;
  }
  return I;
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

  constructor(deps: FixtureVisualSyncDeps) {
    this.#deps = deps;
  }

  /** `now` and `dt` in seconds; `cameraPosition` places the lens glow flares. */
  update(now: number, dt: number, cameraPosition: Vector3): void {
    this.#camera.copy(cameraPosition);
    this.#deps.lights.reset();
    for (const v of this.#deps.visuals) {
      const o = v.fixture.out,
        I = gatedIntensity(o, now);
      if (v.kind === 'screen') syncScreen(this.#deps.screen, this.#deps.beamTime, o, I, now);
      else this.#syncLight(v, o, I, dt);
    }
  }

  #syncLight(v: LightVisual, o: Readonly<AttrValues>, I: number, dt: number): void {
    const deps = this.#deps,
      f = v.fixture,
      T = f.T,
      dir = this.#dir;
    syncPose(v, o, dt, dir);
    const col: RgbTriple = [outputValue(o, 'r') / 100, outputValue(o, 'g') / 100, outputValue(o, 'b') / 100];
    v.bodyMat.emissive.setHex(deps.selection.has(f.id) ? 0x7a5a00 : 0x000000);
    v.lensMat.color.setRGB(0.03 + col[0] * I * 3, 0.03 + col[1] * I * 3, 0.03 + col[2] * I * 3);
    if (v.pix) v.pix.material.color.setRGB(0.02 + col[0] * I * 2.2, 0.02 + col[1] * I * 2.2, 0.02 + col[2] * I * 2.2);
    const on = I > 0.004;
    v.beam.visible = v.pool.visible = v.glow.visible = on;
    if (!on) return;
    const origin = this.#origin.copy(f.pos).addScaledVector(dir, v.lensOff + 0.02);
    const zoom = clamp(outputValue(o, 'zoom'), T.zr[0], T.zr[1]),
      tz = Math.tan((zoom / 2) * D2R);
    const hit = deps.hitSurface(origin, dir),
      L = hit ? hit.t : 85;
    const frame = { visual: v, o, I, col, dir, origin, zoom, tz, hit, L };
    const gob = syncBeam(frame);
    syncPool(frame, gob, deps.goboTextures, deps.normals, deps.lights);
    if (f.type === 'blinder') deps.lights.addBlinder(I);
    syncGlow(frame, this.#camera);
  }
}
