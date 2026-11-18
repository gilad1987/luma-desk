import { Vector3, type Texture } from 'three';
import { clamp, D2R } from '../../../core';
import type { AttrValues } from '../../../domain/attributes';
import type { Selection } from '../../../engine/Selection';
import type { LightFrame } from '../../lights/LightFrame';
import type { LightVisual } from '../FixtureVisual';
import { outputValue, type BeamFrame, type BeamFrameSlot } from './BeamFrame';
import { syncBeam } from './syncBeam';
import { syncGlow } from './syncGlow';
import { syncLens } from './syncLens';
import { syncPool } from './syncPool';
import { syncPose } from './syncPose';

/**
 * Where beams land. Structural, so the stage's surface hitter (rebuilt with the rig) and the venue's free
 * `hitSurface` both fit without this module naming either.
 */
export interface BeamSurface {
  hit(origin: Vector3, direction: Vector3): BeamFrame['hit'];
}

/** What a light's frame update reads and feeds; owned by render core and the fixture kit. */
export interface LightSyncDeps {
  readonly selection: Pick<Selection, 'has'>;
  readonly goboTextures: readonly Texture[];
  /** Render core's per-frame light aggregate; blinders and pools add to it. */
  readonly lights: LightFrame;
  readonly surface: BeamSurface;
}

/**
 * The frame update of one light visual: pose, body and lens colour, pixel bar, then beam, pool and glow. It owns the
 * scratch vectors, the colour buffer and one beam carrier, so the per-frame loop allocates nothing.
 */
export class LightSync {
  /** The camera position of this frame; the lens glow flares towards it. */
  readonly camera = new Vector3();
  readonly #deps: LightSyncDeps;
  readonly #dir = new Vector3();
  readonly #origin = new Vector3();
  /** The fixture colour, 0..1, refilled per fixture; a step that keeps it past the fixture's sync copies it. */
  readonly #col: [number, number, number] = [0, 0, 0];
  /** The beam carrier, made by the first lit fixture and refilled for every later one. */
  #frame: BeamFrameSlot | null = null;

  constructor(deps: LightSyncDeps) {
    this.#deps = deps;
  }

  /** `intensity` is the strobe-gated dimmer (0..1); `dt` in seconds eases the mover heads. */
  sync(v: LightVisual, o: Readonly<AttrValues>, intensity: number, dt: number): void {
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
    const hit = deps.surface.hit(origin, dir),
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
    syncGlow(frame, this.camera);
  }
}
