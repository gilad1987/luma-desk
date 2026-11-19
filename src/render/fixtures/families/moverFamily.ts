import type { CanvasTexture } from 'three';
import type { ProductId } from '../../../domain/fixtureProducts';
import type { MoverBody } from '../../../domain/fixtureProducts/FixtureProduct';
import type { CanvasPainter } from '../../shared';
import type { ModelBuilder } from '../FixtureModels';
import { MOVER_LENS_FACES } from '../lens/moverLensFaces';
import { merge } from '../modelGeometry';
import type { ModelPrimitives } from '../ModelPrimitives';
import type { RobeHead, RobeHeadGeometry } from '../models/robeMover';
import type { FamilyScope } from './familyModels';
import { barrelProfile, bezelProfile, ribRings, sideVents } from './moverProfile';

/** The native painter behind each mover lens face: 'rings' is the FORTE's zoom lens, 'hotspot' the MegaPointe's. */
const MOVER_FACE_PAINTERS = {
  rings: MOVER_LENS_FACES.forte,
  hotspot: MOVER_LENS_FACES.megapointe,
} as const satisfies Record<MoverBody['face'], CanvasPainter>;

/**
 * The native Robe builder for the product's head, with the lazily painted lens face set on the fixture's own lens
 * material first, which a native head gets from `createLensTextures` through the builder instead.
 */
export function moverBuilder(scope: FamilyScope, id: ProductId, body: MoverBody): ModelBuilder {
  const build = scope.robe(moverHead(body), false);
  const lens = (): CanvasTexture => scope.lenses.get(id, MOVER_FACE_PAINTERS[body.face]);
  return (c) => {
    c.lensMat.map = lens();
    return build(c);
  };
}

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

function headGeometry(prims: ModelPrimitives, body: MoverBody): RobeHeadGeometry {
  const { lathe } = prims;
  return {
    head: merge([lathe(barrelProfile(body))]),
    headTrim: merge([lathe(bezelProfile(body)), ...ribRings(prims, body)]),
    ...(body.vents === true ? { vents: sideVents(prims, body) } : {}),
  };
}
