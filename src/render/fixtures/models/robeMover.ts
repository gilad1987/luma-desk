import { Group, type BufferGeometry } from 'three';
import { addMesh } from '../../shared';
import type { ModelPrimitives } from '../ModelPrimitives';
import type { BuiltModel, ModelContext, ModelKit } from './ModelContext';
import { addRobePanel, addRoundLens } from './modelFaces';
import type { RobeBaseGeometry } from './robeBase';
import type { RobeYokeGeometry } from './robeYoke';

/** A Robe head's own parts: barrel, dark trim, and vent grilles on some models. */
export interface RobeHeadGeometry {
  readonly head: BufferGeometry;
  readonly headTrim: BufferGeometry;
  readonly vents?: BufferGeometry;
}

/**
 * One Robe moving-head model (FORTE, MegaPointe, Spiider): yoke arm offset `ax`, the lens radius, depth and offset,
 * and the head geometry; `fs` adds the RoboSpot camera of the FORTE FS.
 */
export interface RobeHead {
  readonly ax: number;
  readonly lensR: number;
  readonly lensY: number;
  readonly lensOff: number;
  geometry(prims: ModelPrimitives, fs: boolean): RobeHeadGeometry;
}

/** Head and yoke geometry of one Robe model, cached per model key. */
export type RobeMoverGeometry = RobeHeadGeometry & RobeYokeGeometry;

/** One Robe mover to build: the head model and its cached head, yoke and base geometry. */
export interface RobeMoverParts {
  readonly model: RobeHead;
  readonly geometry: RobeMoverGeometry;
  readonly base: RobeBaseGeometry;
}

/** Builds a Robe mover in the hang orientation: base on the group, the yoke pans, the tilt group holds the head. */
export function buildRobeMover(
  kit: ModelKit,
  c: ModelContext,
  { model, geometry, base: baseGeometry }: RobeMoverParts,
): BuiltModel {
  const { trim, vent } = kit.materials;
  const base = addMesh(c.g, baseGeometry.body, c.bodyMat);
  addMesh(c.g, baseGeometry.trim, trim);
  addRobePanel(kit, c, c.g, [0.83, 0.351, 0.96, 0.22]);
  const yoke = new Group();
  yoke.position.y = 0.66;
  c.g.add(yoke);
  addMesh(yoke, geometry.yoke, c.bodyMat);
  addMesh(yoke, geometry.yokeTrim, trim);
  const tiltG = new Group();
  tiltG.position.y = -0.66;
  yoke.add(tiltG);
  const head = addMesh(tiltG, geometry.head, c.bodyMat);
  addMesh(tiltG, geometry.headTrim, trim);
  if (geometry.vents) addMesh(tiltG, geometry.vents, vent);
  const lens = addRoundLens(kit, c, tiltG, { y: -model.lensY, radius: model.lensR });
  return { head, lens, lensOff: model.lensOff, joints: { yoke, tiltG }, pick: [base, head] };
}
