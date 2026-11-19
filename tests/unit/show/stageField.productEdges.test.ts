/**
 * Owns how the show loader treats a bad stored `product`: an id this desk does not know loads the design with the
 * fixture as its base type and no toast, and a non-string product rejects the stage, so the built-in stage applies
 * with one toast. The parser rule itself is owned by parseProduct.test.ts and parseProduct.edges.test.ts.
 */
import { describe, expect, it } from 'vitest';
import type { StageFixture } from '../../../src/domain/stage/StageDesign';
import { createTemplate } from '../../../src/domain/stage/templates';
import { BAD_STAGE, jsonRoundTrip, stageWorld } from '../../shared';

/** The theatre template plus one floor spot with `product` set to `value`, as a hand-edited or newer show holds it. */
function theatreWith(value: unknown) {
  const theatre = createTemplate('theatre');
  const id = Math.max(...theatre.fixtures.map((f) => f.id)) + 1;
  const spot: StageFixture = { id, type: 'spot', role: 'front', trussId: null, position: [0, 1.2, 2], mount: 'floor' };
  const stage = jsonRoundTrip({ ...theatre, fixtures: [...theatre.fixtures, { ...spot, product: value }] });
  return { theatre, spot, stage };
}

describe('show stage field: bad product', () => {
  it('loads a stage whose product id is unknown, with the fixture as its base type and no toast', () => {
    const { theatre, spot, stage } = theatreWith('acme-x');
    const world = stageWorld();
    world.serializer.load({ stage });
    expect([world.service.isBuiltIn, world.service.design, world.messages]).toStrictEqual([
      false,
      { ...theatre, fixtures: [...theatre.fixtures, spot] },
      [],
    ]);
  });

  it.each([null, 5, {}])('applies the built-in stage with one toast for the non-string product %j', (value) => {
    const world = stageWorld(createTemplate('theatre'));
    world.serializer.load({ stage: theatreWith(value).stage });
    expect([world.service.isBuiltIn, world.messages]).toStrictEqual([true, [{ kind: 'toast', text: BAD_STAGE }]]);
  });
});
