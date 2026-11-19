import { Box3, Mesh, Vector3 } from 'three';
import { Fixture, type FixtureInit } from '../../../../src/domain/Fixture';
import { FixtureVisualBuilder, type FixtureVisual } from '../../../../src/render/fixtures';
import { buildFixtureScene } from './buildFixtureScene';

/** The fixture to build: its type, an optional catalogue product, its mount (default hung) and `bodyScale`. */
export type BoxFixture = Pick<FixtureInit, 'type' | 'product'> &
  Partial<Pick<FixtureInit, 'mount'>> & { readonly bodyScale?: number };

/**
 * Builds fixtures the way the desk does: one fixture scene and builder for every call, so the span and mount-height
 * pins (`bodySpans`, `mountHeights`, `productSpans`) and the product shape test (`mover.test.ts`) share one path.
 */
export function visualBuilder(): (fixture: BoxFixture) => FixtureVisual {
  const { scene, prims, beam, gobo, models, lensTextures, screenMeshes } = buildFixtureScene();
  const picker = { register: () => undefined };
  const deps = { scene, prims, beam, gobo, models, lensTextures, screenMesh: screenMeshes, picker };
  const builder = new FixtureVisualBuilder(deps);
  return ({ type, product, mount = 'hang', bodyScale }) => {
    const fixture = new Fixture({ id: 9000, type, pos: new Vector3(), mount, fixed: null, product });
    if (bodyScale !== undefined) fixture.bodyScale = bodyScale;
    return builder.build(fixture);
  };
}

/**
 * The world bounding box of every visible mesh of a built visual, in its pose now; a screen fixture, which has no
 * body, gives an empty box at the origin.
 */
export function visualBox(visual: FixtureVisual): Box3 {
  const box = new Box3();
  if (!('g' in visual)) return box.setFromCenterAndSize(new Vector3(), new Vector3());
  visual.g.updateMatrixWorld(true);
  visual.g.traverse((o) => void (o instanceof Mesh && o.visible && box.expandByObject(o)));
  return box;
}

/** Measures the bodies the desk really builds (`visualBuilder`) at their rest pose, with {@link visualBox}. */
export function boxBuilder(): (fixture: BoxFixture) => Box3 {
  const build = visualBuilder();
  return (fixture) => visualBox(build(fixture));
}

/** The largest dimension of `box` in millimetres, the unit the span pins compare in. */
export function spanMm(box: Box3): number {
  const size = box.getSize(new Vector3());
  return Math.round(Math.max(size.x, size.y, size.z) * 1000);
}
