// @vitest-environment jsdom
/**
 * Acceptance (1) of the MVR export: every template exported and imported again is the same stage. Fixtures keep id,
 * every desk field, position, aim (`dirFrom`/`aimAt`) and patch; the luma data brings back venue, scenery, deck,
 * walls, risers and
 * trusses; and a luma export gives no missing-GDTF or missing-mesh noise.
 */
import { describe, expect, it } from 'vitest';
import { createTemplate, TEMPLATE_IDS } from '../../../src/domain/stage/templates/index.ts';
import { exportMvr } from '../../../src/mvr/export/exportMvr.ts';
import { importMvr } from '../../../src/mvr/index.ts';
import { expectRigKept } from '../../shared/index.ts';

describe('MVR round trip of the templates', () => {
  it.each(TEMPLATE_IDS)('gives back the %s template', async (id) => {
    const design = createTemplate(id);
    const result = await importMvr(exportMvr(design).bytes, { name: id });
    const after = result.design;
    expectRigKept(design, after);
    const floor = design.fixtures.filter((fixture) => fixture.mount === 'floor' && !fixture.rotation);
    const twins = new Map(after.fixtures.map((fixture) => [fixture.id, fixture]));
    expect(
      floor.map((fixture) => twins.get(fixture.id)?.rotation),
      'floor units keep the floor pose',
    ).toEqual(floor.map(() => undefined));
    const { venue, scenery, deck, screens, risers, trusses } = design;
    expect(after).toMatchObject({ venue, scenery, deck, screens, risers, trusses });
    expect(after.mvr?.offset).toEqual([0, 0, 0]);
    const codes = result.warnings.map((warning) => warning.code);
    expect(codes.filter((code) => ['missing-gdtf', 'missing-mesh', 'no-geometry'].includes(code))).toEqual([]);
    expect(result.summary).toMatchObject({ fixtureCount: design.fixtures.length, missingGdtfCount: 0 });
  });
});
