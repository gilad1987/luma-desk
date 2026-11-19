import type { MeshStandardMaterial, Texture } from 'three';
import { createHallEnvironment } from '../mvr/hallEnvironment';
import { BODY_REFLECTION, hallLevel } from './hallLevel';

export { BODY_REFLECTION, hallLevel, RIG_REFLECTION, RIG_REFLECTION_MAX } from './hallLevel';

/*
 * The ONE hall map of an imported stage and the materials that mirror it: the class looks of the scenery
 * (`followHall`) and the fixture bodies (`reflectHall`). A second copy, which the renderer made of a raw panorama on
 * the scenery, cost its texture and a work target of the renderer that lives as long as the page.
 */

/** The materials whose reflection follows the hall, with their share of it; a material leaves when it is disposed. */
const followers = new Map<MeshStandardMaterial, number>();
/** The hall as a prefiltered map, with the call that frees it; made by `prefilterHall` while a hall is wanted. */
export interface Prefiltered {
  readonly texture: Texture;
  dispose(): void;
}
let made: Prefiltered | null = null;
let isWanted = false;
let house = 0;
let bounce = 0;
/** The bounce the surface light reported since the last sync, or undefined when no frame reported one. */
let reported: number | undefined;
/** Syncs in a row with no report. Two syncs can run for one draw; only the second in a row means "no surface light". */
let silent = 0;

const intensity = (material: MeshStandardMaterial, share: number): number =>
  share * hallLevel(house, bounce, material.metalness);

/** Gives every follower the map of this moment; the program of a material changes with it, so it is marked. */
function hand(map: Texture | null): void {
  for (const material of followers.keys()) {
    material.envMap = map;
    material.needsUpdate = true;
  }
}

/** Makes `material` mirror the hall at `share` of it: it gets the hall map now, or when the map is made. */
export function followHall(material: MeshStandardMaterial, share: number): void {
  followers.set(material, share);
  material.addEventListener('dispose', () => followers.delete(material));
  material.envMap = made?.texture ?? null;
  material.envMapIntensity = intensity(material, share);
}

/** The surface light reports the bounce radiance (linear RGB, on white) of the frame it draws. */
export function noteBounce(r: number, g: number, b: number): void {
  reported = 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Before the draw: `houseLevel` is the house control (0..1) of an imported stage, or undefined on a built-in stage,
 * which has no hall: then nothing is made, the hall map of an earlier import is freed and every level is back at
 * its start, so the next stage takes nothing from this one. The hall also calls it with undefined the moment it goes.
 */
export function syncHallReflection(houseLevel: number | undefined): void {
  const next = reported;
  reported = undefined;
  isWanted = houseLevel !== undefined;
  if (houseLevel === undefined) {
    made?.dispose();
    if (made) hand(null);
    [made, house, bounce, silent] = [null, 0, 0, 0];
    return;
  }
  silent = next === undefined ? silent + 1 : 0;
  // a second sync before the draw has no report yet: the bounce of the last draw still stands
  const lit = next ?? (silent < 2 ? bounce : 0);
  if (houseLevel === house && lit === bounce) return;
  [house, bounce] = [houseLevel, lit];
  for (const [material, share] of followers) material.envMapIntensity = intensity(material, share);
}

/**
 * Gives a fixture body the hall to mirror while an imported stage is on, and takes it away on a built-in stage,
 * where the body draws exactly as it always did. Cheap enough for every fixture on every frame.
 */
export function reflectHall(material: MeshStandardMaterial, share = BODY_REFLECTION): void {
  const map = made?.texture ?? null;
  material.envMap = map;
  material.envMapIntensity = map ? intensity(material, share) : 1;
}

/**
 * Makes the hall map while a hall is wanted and none is there: `prefilter` turns the panorama into the map a
 * material samples, with a generator of the caller's own that it frees at once. The renderer's own generator keeps
 * its work targets for the life of the page, so a built-in stage after an import would still hold them. True when
 * the map is there after the call.
 */
export function prefilterHall(prefilter: (panorama: Texture) => Prefiltered): boolean {
  if (made || !isWanted) return made !== null;
  const panorama = createHallEnvironment();
  made = prefilter(panorama);
  panorama.dispose();
  hand(made.texture);
  return true;
}
