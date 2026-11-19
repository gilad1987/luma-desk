import { Color, DirectionalLight, FogExp2, HemisphereLight, type FogBase, type Scene, type Texture } from 'three';
import { houseResponse } from '../../domain/stage/showBalance';
import type { StageBounds } from '../../domain/stage/types';
import { mvrPoolGain } from '../lighting/poolBalance';
import { surfaceLight } from '../lighting/surfaceLight';
import { HALL_FILL, HALL_LIGHTS, HALL_RISE } from './hallLevels';

/** Neutral LED work light, about 4500 K as seen: a blackbody 4500 K hex turns amber once made linear, so a lighter tint. */
const WORK_WHITE = 0xfff0e4;
/** The near-black, colourless hall around an imported stage: no night sky, no blue or purple tint. */
const HALL_DARK = 0x050505;
/** Thin distance fog: far rows fade a little, the stage stays clear. */
const HALL_FOG_DENSITY = 0.0018;
const WORK_LIGHTS = ['key', 'side', 'back'] as const;
type Rig = { readonly fill: HemisphereLight } & Readonly<Record<'key' | 'side' | 'back', DirectionalLight>>;

/**
 * The house light of an imported stage: a soft neutral fill plus three high directional work lights placed from the
 * box that frames stage and seats. Directional light has no falloff, so stage and house get the same level and no
 * near face clips white the way the demo venue's close house spots did. The rig and the hall background exist only
 * while `show` is on; `hide` frees them and restores the scene's background and fog: a built-in stage does not change.
 */
export class MvrHallLight {
  readonly #scene: Scene;
  #rig: Rig | null = null;
  #saved: { readonly background: Color | Texture | null; readonly fog: FogBase | null } | null = null;

  constructor(scene: Scene) {
    this.#scene = scene;
  }

  /** True while the stage comes from an MVR file; the demo house and night lights stay dark then. */
  get isOn(): boolean {
    return this.#rig !== null;
  }

  /** Turns the hall on (once) and places the lights over `box`. */
  show(box: StageBounds): void {
    this.#rig ??= this.#build();
    this.place(box);
  }

  /** Places the lights over `box` (the camera box of stage plus seats, once known); nothing to do while off. */
  place(box: StageBounds): void {
    const rig = this.#rig;
    if (!rig) return;
    const [x0, y0, z0] = box.min;
    const [x1, y1, z1] = box.max;
    const centre: readonly [number, number, number] = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2];
    const span = Math.max(x1 - x0, z1 - z0, 10);
    for (const name of WORK_LIGHTS) {
      const { dx, dz } = HALL_LIGHTS[name];
      rig[name].position.set(centre[0] + dx * span, y1 + span * HALL_RISE, centre[2] + dz * span);
      rig[name].target.position.set(...centre);
    }
  }

  /** Frees the rig and restores the scene's background and fog; nothing to do while off. */
  hide(): void {
    const rig = this.#rig;
    if (!rig) return;
    for (const light of [rig.fill, rig.key, rig.side, rig.back]) {
      this.#scene.remove(light);
      if (light instanceof DirectionalLight) this.#scene.remove(light.target);
      light.dispose();
    }
    if (this.#saved) {
      this.#scene.background = this.#saved.background;
      this.#scene.fog = this.#saved.fog;
    }
    this.#rig = null;
    this.#saved = null;
    surfaceLight.poolGain = 1;
  }

  /** The house control, 0..1, through the square law of `houseResponse`; called every frame by the scene lights. */
  setLevel(level: number): void {
    const rig = this.#rig;
    if (!rig) return;
    surfaceLight.poolGain = mvrPoolGain(); // per frame: Real light and the scenery load change it; `hide` resets it
    const light = houseResponse(level);
    rig.fill.intensity = light * HALL_FILL;
    for (const name of WORK_LIGHTS) rig[name].intensity = light * HALL_LIGHTS[name].level;
  }

  #build(): Rig {
    const scene = this.#scene;
    this.#saved = { background: scene.background, fog: scene.fog };
    scene.background = new Color(HALL_DARK);
    scene.fog = new FogExp2(HALL_DARK, HALL_FOG_DENSITY);
    const directional = (): DirectionalLight => {
      const light = new DirectionalLight(WORK_WHITE, 0);
      scene.add(light, light.target);
      return light;
    };
    const fill = new HemisphereLight(WORK_WHITE, 0x1a1a1a, 0);
    scene.add(fill);
    return { fill, key: directional(), side: directional(), back: directional() };
  }
}
