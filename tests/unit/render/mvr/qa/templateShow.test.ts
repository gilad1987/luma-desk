// @vitest-environment jsdom
/**
 * QA of the whole desk export path for every built-in template: exportMeshes -> exportMvr -> importMvr ->
 * MvrStage.show. Owns "the desk draws its own export once": no mesh fails, the luma meshes are not drawn on top of
 * the stage the luma data rebuilt, and beam surfaces are the design's alone. Mesh shapes are owned by the export tests.
 */
import { describe, expect, it } from 'vitest';
import { surfacesOf } from '../../../../../src/domain/stage/surfaces.ts';
import { createTemplate, TEMPLATE_IDS } from '../../../../../src/domain/stage/templates/index.ts';
import { MvrStage } from '../../../../../src/render/mvr/MvrStage.ts';
import { mvrSurfaces } from '../../../../../src/render/mvr/mvrSurfaces.ts';
import { exportRoundTrip } from '../../../../shared/index.ts';

describe('MvrStage.show of an exported template', () => {
  it.each(TEMPLATE_IDS)('draws no second %s stage and keeps the design surfaces', async (id) => {
    const design = createTemplate(id);
    const { result } = await exportRoundTrip(design);
    const stage = new MvrStage();
    const failures = await stage.show(result);
    expect([failures, stage.group.children.length]).toEqual([[], 0]);
    expect(mvrSurfaces(result.design)).toStrictEqual(surfacesOf(result.design));
    expect(surfacesOf(result.design)).toStrictEqual(surfacesOf(design));
    expect(result.design.fixtures).toHaveLength(design.fixtures.length);
  });
});
