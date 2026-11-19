// @vitest-environment jsdom
/**
 * The pass-through summary names a GDTF file as missing only when the import would not find it either: the same
 * `findGdtfMatch` rules over the root-level entries, so a Vectorworks `Maker@Model.gdtf` file serves the spec `Model`.
 */
import { describe, expect, it } from 'vitest';
import { exportMvr, importMvr } from '../../../../src/mvr/index.ts';
import { fx, passFile, passUuid as u } from '../../../shared/index.ts';

const NOTE = 'GDTF files not in this export';

async function notesOf(gdtf: string, extra: Readonly<Record<string, Uint8Array>> = {}): Promise<string> {
  const original = passFile(fx(u(1), 1, { gdtf }), extra);
  const { design } = await importMvr(original, { name: 'a.mvr' });
  return exportMvr(design, { original }).summary.notes.join('\n');
}

describe('missing GDTF files in the pass-through summary', () => {
  it('finds the Vectorworks file Test@Spot.gdtf for the spec Spot', async () => {
    expect(await notesOf('Spot')).not.toContain(NOTE);
  });

  it('still names a spec no root-level file serves', async () => {
    const inFolder = { 'sub/Wash.gdtf': new TextEncoder().encode('not a real gdtf') };
    expect(await notesOf('Wash', inFolder)).toContain(`${NOTE}; get them from GDTF-Share: Wash.`);
  });
});
