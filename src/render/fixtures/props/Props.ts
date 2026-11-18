import type { Object3D } from 'three';
import { DECK } from '../../../domain/venue';
import type { AppState } from '../../../engine/AppState';
import type { FohRig } from '../../camera/FohRig';
import type { SharedUniform } from '../BeamMaterial';
import type { ModelKit } from '../models/ModelContext';
import { buildHazers, type Hazers } from './hazers';
import { buildRoboSpotStation } from './roboSpotStation';

/** What the props build into and read each frame. */
export interface PropsDeps {
  readonly scene: Object3D;
  readonly kit: ModelKit;
  /** The camera views' FOH rig (the MA view hides it); the station stands on the venue's riser in it. */
  readonly fohRig: Pick<FohRig, 'addRider'>;
  readonly state: Pick<AppState, 'haze'>;
  /** The beams' shared haze uniform; the props copy the Haze master into it each frame. */
  readonly beamHaze: SharedUniform;
}

/**
 * Scenery that is not patched: the hazers with their puffs, and the RoboSpot station. The props live with the
 * fixtures because they are cut from the same model primitives and aluminium material.
 */
export class Props {
  readonly #hazers: Hazers;
  readonly #state: Pick<AppState, 'haze'>;
  readonly #beamHaze: SharedUniform;
  #hazersShown = true;

  /** Builds the hazers, then the RoboSpot station (legacy order, decision 24). */
  constructor(deps: PropsDeps) {
    this.#hazers = buildHazers(deps.scene, deps.kit);
    buildRoboSpotStation(deps.scene, deps.kit, deps.fohRig);
    this.#state = deps.state;
    this.#beamHaze = deps.beamHaze;
  }

  /**
   * Shows or hides the hazer cases and their puffs. They stand on the built-in deck, so a stage that brings its own
   * rig (an MVR import) hides them; the Haze master still reaches the beams, as haze is the room's air, not a prop.
   */
  setHazersShown(isShown: boolean): void {
    this.#hazersShown = isShown;
    for (const hazer of this.#hazers.cases) hazer.visible = isShown;
  }

  /** Pushes the Haze master to the beams; each puff rises, grows and fades on a 6.25 s cycle scaled by the haze. */
  update(now: number): void {
    this.#beamHaze.value = this.#state.haze;
    const h = this.#beamHaze.value;
    for (const p of this.#hazers.puffs) {
      p.sp.visible = this.#hazersShown && h > 0.01;
      if (!p.sp.visible) continue;
      const k = (now * 0.16 + p.ph) % 1,
        sc = (0.5 + k * 2.4) * (0.6 + h * 0.6);
      p.sp.position.set(p.x + Math.sin(now * 0.4 + p.ph * 6) * 0.2 * k, DECK + 0.85 + k * 2.2, p.z - k * 0.6);
      p.sp.scale.set(sc, sc, 1);
      p.sp.material.opacity = h * 0.55 * Math.sin(Math.PI * k);
    }
  }
}
