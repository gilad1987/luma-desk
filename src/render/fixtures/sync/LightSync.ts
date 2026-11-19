import { Vector3, type Texture } from 'three';
import { clamp, D2R } from '../../../core';
import type { AttrValues } from '../../../domain/attributes';
import type { Selection } from '../../../engine/Selection';
import { reflectHall } from '../../lighting/hallReflection';
import type { LightFrame } from '../../lights/LightFrame';
import type { LightVisual } from '../FixtureVisual';
import { outputValue, type BeamFrame, type BeamFrameSlot } from './BeamFrame';
import { syncBeam } from './syncBeam';
import { syncGlow } from './syncGlow';
import { syncLens } from './syncLens';
import { syncPool } from './syncPool';
import { syncPose } from './syncPose';

/**
 * Metres the cone of a desk model starts ahead of its lens face, so the cone does not fight the lens disc for depth
 * (the legacy desk drew it so, and the built-in baselines hold it). A GDTF body has no such gap: the GDTF spec makes
 * the origin of its Beam geometry the origin of the rendered beam, and its lens disc already sits clear of it.
 */
export const DESK_LENS_GAP = 0.02;

/**
 * Where beams land: the stage's `SurfaceHit`, which follows the current design and venue. Structural, so a test can
 * pass its own hitter without this module naming the render surface code.
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
    reflectHall(v.bodyMat);
    syncLens(v, col, intensity);
    const on = intensity > 0.004;
    v.beam.visible = v.pool.visible = v.glow.visible = on;
    if (!on) return;
    const origin = this.#origin.copy(f.pos).addScaledVector(dir, v.lensOff + (v.beamAtLens ? 0 : DESK_LENS_GAP));
    if (v.axisAt) origin.add(v.axisAt);
    // a GDTF mover: the Beam origin goes through the world matrix of its section, so a lens beside the tilt axis
    // turns with the head and the cone starts on the drawn lens (`localToWorld` writes into `origin`, no allocation)
    if (v.beamFrom) v.beamFrom.holder.localToWorld(origin.copy(v.beamFrom.at));
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
