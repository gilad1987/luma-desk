import { Box3, Mesh, Vector3 } from 'three';
import { Fixture, type Mount } from '../../../../src/domain/Fixture';
import type { FixtureTypeId } from '../../../../src/domain/FixtureType';
import type { ProductId } from '../../../../src/domain/fixtureProducts';
import { FixtureVisualBuilder } from '../../../../src/render/fixtures';
import { buildFixtureScene } from './buildFixtureScene';

/** The fixture to measure: its type, an optional catalogue product, its mount (default hung) and `bodyScale`. */
export interface BoxFixture {
  readonly type: FixtureTypeId;
  readonly product?: ProductId;
  readonly mount?: Mount;
  readonly bodyScale?: number;
}

/**
 * Measures the bodies the desk really builds: one fixture scene and builder for every call, so the span and
 * mount-height pins (`bodySpans`, `mountHeights`, `productSpans`) share one measuring path. The box is the world
 * bounding box of every visible mesh of the built visual; a screen fixture, which has no body, gives an empty box
 * at the origin.
 */
export function boxBuilder(): (fixture: BoxFixture) => Box3 {
  const { scene, prims, beam, gobo, models, lensTextures, screenMeshes } = buildFixtureScene();
  const picker = { register: () => undefined };
  const deps = { scene, prims, beam, gobo, models, lensTextures, screenMesh: screenMeshes, picker };
  const builder = new FixtureVisualBuilder(deps);
  return ({ type, product, mount = 'hang', bodyScale }) => {
    const fixture = new Fixture({ id: 9000, type, pos: new Vector3(), mount, fixed: null, product });
    if (bodyScale !== undefined) fixture.bodyScale = bodyScale;
    const visual = builder.build(fixture);
    const box = new Box3();
    if (!('g' in visual)) return box.setFromCenterAndSize(new Vector3(), new Vector3());
    visual.g.updateMatrixWorld(true);
    visual.g.traverse((o) => void (o instanceof Mesh && o.visible && box.expandByObject(o)));
    return box;
  };
}

/** The largest dimension of `box` in millimetres, the unit the span pins compare in. */
export function spanMm(box: Box3): number {
  const size = box.getSize(new Vector3());
  return Math.round(Math.max(size.x, size.y, size.z) * 1000);
}
