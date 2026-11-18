import type { Object3D } from 'three';
import type { SceneryRegistry } from '../stage/SceneryRegistry';
import { BandFit } from './BandFit';
import { buildBandStage } from './BandStage';
import { buildCrowd } from './Crowd';
import type { CrowdBounceUniforms } from './crowdBounce';
import type { TerraceHeight } from './crowdLayout';
import type { VenueMaterials } from './materials';
import { buildPaHangs } from './PaHangs';
import type { Performer } from './performerSpec';

/** The band part of a venue: the members the beat moves and the fit that moves them with the deck. */
export interface BandArea {
  readonly performers: readonly Performer[];
  readonly band: BandFit;
}

/** Runs `build` and returns its result with every child it appended to `scene`, in build order. */
function appendedBy<T>(scene: Object3D, build: () => T): [T, Object3D[]] {
  const from = scene.children.length;
  const result = build();
  return [result, scene.children.slice(from)];
}

/**
 * Builds the PA, then the backline, band and orchestra, and registers them all as the `band` scenery part. The PA
 * comes first, before the band layout spread starts counting, so the spread never moves it (legacy order). The PA
 * hangs go to the fit apart from the other objects, as they hang under the trusses instead of riding the deck.
 */
export function buildBandArea(scene: Object3D, materials: VenueMaterials, scenery: SceneryRegistry): BandArea {
  const [hangs, pa] = appendedBy(scene, () => buildPaHangs(scene, materials.dark));
  const [performers, band] = appendedBy(scene, () => buildBandStage(scene, materials));
  scenery.register('band', ...pa, ...band);
  const hung = new Set(hangs.map((h) => h.group));
  const moved = [...pa.filter((o) => !hung.has(o)), ...band];
  return { performers, band: new BandFit(moved, performers, hangs) };
}

/** Builds the chairs and the audience on the venue's ground and registers them as the `crowd` scenery part. */
export function buildCrowdArea(scene: Object3D, ground: TerraceHeight, scenery: SceneryRegistry): CrowdBounceUniforms {
  const [crowd, objects] = appendedBy(scene, () => buildCrowd(scene, ground));
  scenery.register('crowd', ...objects);
  return crowd;
}
