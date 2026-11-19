import type { MoverBody } from '../../../domain/fixtureProducts/FixtureProduct';
import { merge } from '../modelGeometry';
import type { ModelPrimitives } from '../ModelPrimitives';
import type { RobeHead, RobeHeadGeometry } from '../models/robeMover';
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

function headGeometry(prims: ModelPrimitives, body: MoverBody): RobeHeadGeometry {
  const { lathe } = prims;
  return {
    head: merge([lathe(barrelProfile(body))]),
    headTrim: merge([lathe(bezelProfile(body)), ...ribRings(prims, body)]),
    ...(body.vents === true ? { vents: sideVents(prims, body) } : {}),
  };
}
