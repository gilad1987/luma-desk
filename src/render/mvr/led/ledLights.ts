import type { Object3D } from 'three';
import { FAR, outside, type Aabb } from '../../../mvr/index';
import { addWallSources, syncWallLights, type WallSource } from './ledLightPool';
import { scale, type V3 } from './ledPose';
import { isShown } from './ledShown';
import { frontSign } from './ledWallFront';
import type { LedWall } from './ledWalls';

export { wallLights } from './ledLightPool';

/** Metres outside the venue box at which a wall counts a quarter of its area. */
const NEAR = 3;

/**
 * The light the panel walls of one import throw on the stage: per wall one wide, soft spot just in front of the
 * wall's middle, with the wall's mean content colour and an intensity of radiance times area (`ledLightPool`, which
 * holds the fixed set of lights and syncs them once per frame). A wall whose layers are all hidden gives no light, and of
 * the walls on screen the four that are largest and at the venue get one; a wall far outside the venue never does.
 * The file does not say which side of a wall is its front: `frontSign` states the rule (the seats, else downstage),
 * and the emitting face of the panels follows the same rule.
 */
export class LedWallLights {
  /** The proxy group of each layer: it says whether the walls of the layer are on screen. */
  readonly #holders = new Map<string, Object3D>();
  readonly #remove: () => void;

  constructor(walls: readonly LedWall[], offset: V3, venue: Aabb, seats?: V3) {
    const sources = walls.flatMap((wall, seed): WallSource[] => {
      const centre: V3 = [wall.centre[0] + offset[0], wall.centre[1] + offset[1], wall.centre[2] + offset[2]];
      const normal = scale(wall.normal, frontSign(centre, wall.normal, { seats, venue }));
      const position: V3 = [centre[0] + 0.3 * normal[0], centre[1] + 0.3 * normal[1], centre[2] + 0.3 * normal[2]];
      const away = outside(venue, centre);
      const weight = away > FAR ? 0 : (wall.width * wall.height) / (1 + (away / NEAR) ** 2);
      // A wall drawn on several layers shines while any of them is shown; hidden, it still names a holder.
      const anchor = (): Object3D | undefined => {
        const holders = wall.layers.flatMap((layer) => this.#holders.get(layer) ?? []);
        return holders.find((holder) => isShown(holder)) ?? holders[0];
      };
      const { width, height } = wall;
      return weight > 0 ? [{ position, normal, width, height, seed, weight, anchor }] : [];
    });
    this.#remove = addWallSources(sources);
  }

  /** Records the proxy group of `layer`: its walls are on screen while that group is shown. */
  attach(layer: string, holder: Object3D): void {
    this.#holders.set(layer, holder);
  }

  /** Gives the walls on screen their lights now; the pool does the same on every frame. */
  sync(): void {
    syncWallLights();
  }

  /** Takes the walls out of the light sources. */
  dispose(): void {
    this.#remove();
  }
}
