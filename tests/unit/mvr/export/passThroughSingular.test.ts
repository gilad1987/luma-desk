// @vitest-environment jsdom
/**
 * A fixture under a parent whose matrix has no inverse (it flattens an axis): no local matrix gives the desk pose,
 * so the export keeps the `<Matrix>` text of the file and says so, and never writes a world matrix as a local one.
 */
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { exportMvr, importMvr } from '../../../../src/mvr/index.ts';
import { fx, passFile, passUuid as u } from '../../../shared/index.ts';

const I = '{1,0,0}{0,1,0}{0,0,1}';
const A = (n: number): string => `<Address break="0">${n}</Address>`;
/** A matrix that flattens Z: its determinant is 0. */
const FLAT = '{1,0,0}{0,1,0}{0,0,0}{0,0,0}';
const INNER = `${I}{100,200,300}`;
const group = (matrix: string): string =>
  `<GroupObject uuid="D0000000-0000-4000-8000-000000000001" name="G"><Matrix>${matrix}</Matrix><ChildList>` +
  `${fx(u(1), 1, { at: INNER, addresses: A(1) })}</ChildList></GroupObject>`;
const UNPLACED =
  '1 fixtures are inside an object whose matrix has no inverse; their Matrix text is kept as the file has it, and a ' +
  'pose from the desk is not written for them.';

/** The scene text and the warnings of an export after the desk moved every fixture by one metre along X. */
async function movedExport(matrix: string) {
  const original = passFile(group(matrix) + fx(u(2), 2, { addresses: A(101) }));
  const { design } = await importMvr(original, { name: 'flat.mvr' });
  const fixtures = design.fixtures.map((f) => ({
    ...f,
    position: [f.position[0] + 1, f.position[1], f.position[2]] as const,
  }));
  const { bytes, summary } = exportMvr({ ...design, fixtures }, { original });
  const xml = strFromU8(unzipSync(bytes)['GeneralSceneDescription.xml'] ?? new Uint8Array());
  return { xml, warnings: summary.report.warnings.map((item) => item.text) };
}

describe('a moved fixture under a parent without an inverse', () => {
  it('keeps the matrix text of the file and is counted in one warning', async () => {
    const { xml, warnings } = await movedExport(FLAT);
    expect(xml).toContain(`<Matrix>${INNER}</Matrix>`);
    expect(xml).toContain(`<Matrix>${I}{1000,0,6000}</Matrix>`);
    expect(warnings).toContain(UNPLACED);
  });

  it('is written as before, without the warning, under a parent that has an inverse', async () => {
    const { xml, warnings } = await movedExport(`${I}{0,0,0}`);
    expect(xml).toContain(`<Matrix>${I}{1100,200,300}</Matrix>`);
    expect(warnings).not.toContain(UNPLACED);
  });
});
