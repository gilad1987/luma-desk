import type { CanvasTexture } from 'three';
import type { MoverBody } from '../../../domain/fixtureProducts/FixtureProduct';
import { merge } from '../modelGeometry';
import type { ModelPrimitives } from '../ModelPrimitives';
import type { BuiltModel, ModelContext, ModelKit } from '../models/ModelContext';
import { buildRobeMover, type RobeHead, type RobeHeadGeometry, type RobeMoverParts } from '../models/robeMover';
import { barrelProfile, bezelProfile, ribRings, sideVents } from './moverProfile';

/**
 * A mover product as a `RobeHead`, so `buildRobeMover` draws it on the shared Robe base and yoke like a native head:
 * the lens numbers come straight from the body, the head geometry is cut from its barrel, bezel, rib and vent numbers.
 */
export function moverHead(body: MoverBody): RobeHead {
  return {
    ax: body.ax,
    lensR: body.lens.r,
    lensY: body.lens.y,
    lensOff: body.lens.off,
    geometry: (prims) => headGeometry(prims, body),
  };
}

/**
 * Builds one mover product fixture: it sets the lazily painted lens face on the fixture's own lens material, which
 * the native path gets from `createLensTextures` through the builder, then builds the Robe mover.
 */
export function buildMover(
  kit: ModelKit,
  c: ModelContext,
  parts: RobeMoverParts,
  lens: () => CanvasTexture,
): BuiltModel {
  c.lensMat.map = lens();
  return buildRobeMover(kit, c, parts);
}

function headGeometry(prims: ModelPrimitives, body: MoverBody): RobeHeadGeometry {
  const { lathe } = prims;
  return {
    head: merge([lathe(barrelProfile(body))]),
    headTrim: merge([lathe(bezelProfile(body)), ...ribRings(prims, body)]),
    ...(body.vents === true ? { vents: sideVents(prims, body) } : {}),
  };
}
