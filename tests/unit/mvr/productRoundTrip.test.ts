// @vitest-environment jsdom
/**
 * Owns the product through a desk MVR round trip: the luma link carries it, so an exported Esprite comes back as an
 * Esprite at the same place (its own mount height shifts the body on export and import), and an unknown product comes
 * back as a plain fixture of its base type. The parser rule itself is owned by parseProduct.test.ts.
 */
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { PRODUCTS } from '../../../src/domain/fixtureProducts/index.ts';
import { MOUNT_HEIGHTS } from '../../../src/domain/fixtureTypes/mountHeights.ts';
import type { StageDesign, StageFixture } from '../../../src/domain/stage/StageDesign.ts';
import { createTemplate } from '../../../src/domain/stage/templates/index.ts';
import { exportMvr, importMvr } from '../../../src/mvr/index.ts';
import { exportRoundTrip } from '../../shared/index.ts';

const SCENE = 'GeneralSceneDescription.xml';

/** The theatre stage with one hung and one floor Esprite as its only fixtures. */
function espriteDesign(): StageDesign {
  const esprite = { type: 'spot', role: 'front', trussId: null, product: 'robe-esprite' } as const;
  const fixtures: StageFixture[] = [
    { ...esprite, id: 1, position: [-1.5, 6.25, 1], mount: 'hang' },
    { ...esprite, id: 2, position: [2, 0.4, 3.5], mount: 'floor' },
  ];
  return { ...createTemplate('theatre'), fixtures };
}

describe('MVR round trip of a product', () => {
  it('brings a hung and a floor Esprite back as Esprites at the same position', async () => {
    const design = espriteDesign();
    const { result } = await exportRoundTrip(design);
    const back = result.design.fixtures;
    expect(back.map((fixture) => fixture.product)).toStrictEqual(['robe-esprite', 'robe-esprite']);
    design.fixtures.forEach((fixture, index) => {
      const position = back[index]?.position ?? [NaN, NaN, NaN];
      position.forEach((value, axis) => expect(value).toBeCloseTo(fixture.position[axis] ?? NaN, 6));
    });
  });

  it('brings a link with an unknown product back as a plain spot, lower by the two mount heights difference', async () => {
    const exported = espriteDesign();
    const entries = unzipSync(exportMvr(exported).bytes);
    const scene = strFromU8(entries[SCENE] ?? new Uint8Array()).replaceAll('robe-esprite', 'acme-x');
    const { design } = await importMvr(zipSync({ ...entries, [SCENE]: strToU8(scene) }), { name: 'x' });
    const fixture = design.fixtures[0];
    // The role and the truss count come from the luma link, so a rejected link block fails here, not only the product.
    // The hung spot lands lower by the two mount heights' difference: the export placed it by the product's height.
    const shift = MOUNT_HEIGHTS.spot.hang - PRODUCTS['robe-esprite'].mountHeight.hang;
    const y = (value: number | undefined): number => Number((value ?? NaN).toFixed(6));
    const facts = [
      scene.includes('acme-x'),
      fixture?.type,
      fixture?.role,
      design.trusses.length,
      fixture && Object.hasOwn(fixture, 'product'),
      y(fixture?.position[1]),
    ];
    const expected = [
      true,
      'spot',
      'front',
      exported.trusses.length,
      false,
      y((exported.fixtures[0]?.position[1] ?? NaN) - shift),
    ];
    expect(facts).toStrictEqual(expected);
  });
});
