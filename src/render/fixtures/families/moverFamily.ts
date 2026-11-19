import type { BufferGeometry, CanvasTexture } from 'three';
import type { ProductId } from '../../../domain/fixtureProducts';
import type { MoverBody } from '../../../domain/fixtureProducts/FixtureProduct';
import type { ModelBuilder } from '../FixtureModels';
import { merge } from '../modelGeometry';
import type { ModelPrimitives, ProfilePoint } from '../ModelPrimitives';
import type { RobeHead, RobeHeadGeometry } from '../models/robeMover';
import type { FamilyScope } from './familyModels';
import { moverFacePainter } from './moverFaces';
import { barrelProfile, bezelProfile, referenceOf, ribRings, sideVents, wallProfiles } from './moverProfile';

/**
 * The native Robe builder for the product's head, with the lazily painted lens face set on the fixture's own lens
 * material first, which a native head gets from `createLensTextures` through the builder instead.
 */
export function moverBuilder(scope: FamilyScope, id: ProductId, body: MoverBody): ModelBuilder {
  const build = scope.robe(moverHead(body), false);
  const lens = (): CanvasTexture => scope.lenses.get(id, moverFacePainter(body.face));
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
  const { segments } = referenceOf(body);
  const lathe = (profile: readonly ProfilePoint[]): BufferGeometry => prims.lathe(profile, segments);
  return {
    head: merge([lathe(barrelProfile(body))]),
    headTrim: merge([lathe(bezelProfile(body)), ...wallProfiles(body).map(lathe), ...ribRings(prims, body)]),
    ...(body.vents === true ? { vents: sideVents(prims, body) } : {}),
  };
}
