/**
 * Owns the product side of the show file's `stage` key: a design with an Esprite saves and loads with its product.
 * The rest of the stage field is owned by stageField.test.ts; the parser rule by parseProduct.test.ts.
 */
import { describe, expect, it } from 'vitest';
import type { StageDesign } from '../../../src/domain/stage/StageDesign';
import { createTemplate } from '../../../src/domain/stage/templates';
import { jsonRoundTrip, stageWorld } from '../../shared';

describe('show stage field: product', () => {
  it('a stage with an Esprite saves and loads deep-equal', () => {
    const theatre = createTemplate('theatre');
    const id = Math.max(...theatre.fixtures.map((f) => f.id)) + 1;
    const esprite = {
      id,
      type: 'spot',
      role: 'front',
      trussId: null,
      position: [0, 1.2, 2],
      mount: 'floor',
      product: 'robe-esprite',
    } as const;
    const design: StageDesign = { ...theatre, fixtures: [...theatre.fixtures, esprite] };
    const source = stageWorld();
    source.serializer.load({ stage: jsonRoundTrip(design) });
    const world = stageWorld();
    world.serializer.load(JSON.parse(source.json()));
    expect([world.service.design, world.service.design.fixtures.at(-1)?.product]).toStrictEqual([
      design,
      'robe-esprite',
    ]);
    expect([...source.messages, ...world.messages]).toEqual([]);
  });
});
