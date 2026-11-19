/**
 * Owns the product side of the show file's `stage` key: a design with one product of each body family (the Esprite
 * mover, the TetraX tilt bar on a truss, the onePATT yoked can) saves and loads with its product.
 * The rest of the stage field is owned by stageField.test.ts; the parser rule by parseProduct.test.ts.
 */
import { describe, expect, it } from 'vitest';
import type { StageDesign, StageFixture } from '../../../src/domain/stage/StageDesign';
import { createTemplate } from '../../../src/domain/stage/templates';
import { jsonRoundTrip, stageWorld } from '../../shared';

/** One added fixture per body family; the id is set by the test. */
const CASES: readonly Omit<StageFixture, 'id'>[] = [
  { type: 'spot', role: 'front', trussId: null, position: [0, 1.2, 2], mount: 'floor', product: 'robe-esprite' },
  { type: 'wash', role: 'mid', trussId: 'pipe-1', position: [1, 6.4, -1.5], mount: 'hang', product: 'robe-tetrax' },
  { type: 'par', role: 'front', trussId: null, position: [-1, 1.2, -6], mount: 'floor', product: 'robe-onepatt' },
];

describe('show stage field: product', () => {
  it.each(CASES)('a stage with a $product saves and loads deep-equal', (added) => {
    const theatre = createTemplate('theatre');
    const id = Math.max(...theatre.fixtures.map((f) => f.id)) + 1;
    const design: StageDesign = { ...theatre, fixtures: [...theatre.fixtures, { ...added, id }] };
    const source = stageWorld();
    source.serializer.load({ stage: jsonRoundTrip(design) });
    const world = stageWorld();
    world.serializer.load(JSON.parse(source.json()));
    expect([world.service.design, world.service.design.fixtures.at(-1)?.product]).toStrictEqual([
      design,
      added.product,
    ]);
    expect([...source.messages, ...world.messages]).toEqual([]);
  });
});
