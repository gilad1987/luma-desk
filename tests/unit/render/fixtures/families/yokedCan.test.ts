/**
 * Owns the shape of a built yokedCan product: the onePATT is a static light with no joints, its head turns in the aim
 * group, its arch hangs in the stand from its top, and the stand turns over on the floor. The lazy creation rule is
 * owned by `lazyProducts.test.ts`, the pinned sizes by `productSpans.test.ts`.
 */
import { Box3, Group, Mesh, type Object3D } from 'three';
import { afterEach, expect, it, vi } from 'vitest';
import { PRODUCTS } from '../../../../../src/domain/fixtureProducts';
import type { LightVisual } from '../../../../../src/render/fixtures';
import { stubCanvasDocument } from '../../stubCanvasDocument';
import { visualBuilder } from '../builtBox';

afterEach(() => vi.unstubAllGlobals());

const { mountHeight } = PRODUCTS['robe-onepatt'];
const mm = (value: number): number => Math.round(value * 1000);

function buildOnePatt(mount: 'hang' | 'floor'): LightVisual {
  stubCanvasDocument();
  const visual = visualBuilder()({ type: 'par', product: 'robe-onepatt', mount });
  if (visual.kind !== 'light') throw new Error('a onePATT builds a light visual');
  visual.g.updateMatrixWorld(true);
  return visual;
}

/** The stand: the one group of the fixture group, besides the pivot, that holds meshes. */
function stand(visual: LightVisual): Object3D {
  const stands = visual.g.children.filter((o) => o instanceof Group && o !== visual.pivot && o.children.length > 0);
  if (stands.length !== 1) throw new Error(`expected one stand group, found ${stands.length}`);
  return stands[0] as Object3D;
}

const meshCount = (o: Object3D): number => o.children.filter((child) => child instanceof Mesh).length;

it('builds the onePATT as a static light: no joints, head and lens in the aim group, arch and knobs in the stand', () => {
  const visual = buildOnePatt('hang');
  const aim = visual.head.parent;
  const st = stand(visual);
  expect([visual.joints, aim?.parent === visual.pivot, visual.lens.parent === aim, meshCount(st)]).toStrictEqual([
    null,
    true,
    true,
    2,
  ]);
  expect(mm(new Box3().setFromObject(st).max.y)).toBe(mm(mountHeight.hang));
});

it('turns the stand over on the floor, so the arch top is the lowest point and the head keeps its pose', () => {
  const hung = buildOnePatt('hang');
  const floor = buildOnePatt('floor');
  const st = stand(floor);
  expect([stand(hung).rotation.z, st.rotation.z, floor.pivot.rotation.z]).toStrictEqual([0, Math.PI, 0]);
  expect(mm(-new Box3().setFromObject(st).min.y)).toBe(mm(mountHeight.floor));
});
