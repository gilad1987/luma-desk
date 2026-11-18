// @vitest-environment jsdom
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createTemplate, TEMPLATE_IDS } from '../../../../src/domain/stage/templates/index.ts';
import { exportMvr } from '../../../../src/mvr/export/exportMvr.ts';
import { exportMeshes } from '../../../../src/render/mvr/export/exportMeshes.ts';
import { MVR_XSD_PATH } from '../../../../scripts/mvrXsdSource.ts';
import { schemaErrors } from './schemaErrors.ts';

/**
 * The export with its mesh files (Part B) adds `<Geometry3D>` and `<Symdef>` elements the mesh-less export in
 * xsd.test.ts never writes, so those must be checked against mvr.xsd too. Skips until `npm run fetch:mvr-xsd` ran.
 */
const HAS_XSD = existsSync(MVR_XSD_PATH);

describe.skipIf(!HAS_XSD)('MVR export with mesh files against mvr.xsd', () => {
  const xsd = HAS_XSD ? readFileSync(MVR_XSD_PATH, 'utf8') : '';

  it.each(TEMPLATE_IDS)('exports the %s template with its meshes as a valid scene', async (id) => {
    const design = createTemplate(id);
    const { bytes, summary } = exportMvr(design, { meshes: await exportMeshes(design) });
    expect(summary.geometryFiles.length).toBeGreaterThan(0);
    expect(await schemaErrors(bytes, xsd)).toEqual([]);
  });
});
