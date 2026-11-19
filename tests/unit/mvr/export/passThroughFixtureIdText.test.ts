// @vitest-environment jsdom
/** Review #14: a renumbered fixture whose FixtureID text is a number with leading zeros gets the new number. */
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign.ts';
import { exportMvr, importMvr } from '../../../../src/mvr/index.ts';
import { parseXml } from '../../../../src/mvr/xml/parseXml.ts';
import { fx, passFile, passUuid as u } from '../../../shared/index.ts';

const IDS = '<FixtureID>1</FixtureID><FixtureIDNumeric>1</FixtureIDNumeric>';
const withIds = (ids: string): Uint8Array => passFile(fx(u(1), 1).replace(IDS, ids));

const texts = (bytes: Uint8Array, tag: string): string[] => {
  const scene = strFromU8(unzipSync(bytes)['GeneralSceneDescription.xml'] ?? new Uint8Array());
  return Array.from(parseXml(scene).getElementsByTagName(tag), (element) => element.textContent ?? '');
};

/** The design of `original` with its one fixture renumbered from `from` to 77. */
async function renumbered(original: Uint8Array, from: number): Promise<StageDesign> {
  const design = (await importMvr(original, { name: 'a.mvr' })).design;
  const info = design.mvr?.fixtures[String(from)];
  if (!design.mvr || !info) throw new Error('no MVR facts');
  const fixtures = design.fixtures.map((fixture) => ({ ...fixture, id: 77 }));
  return { ...design, mvr: { ...design.mvr, fixtures: { '77': info } }, fixtures };
}

describe('pass-through FixtureID text of a renumbered fixture (review #14)', () => {
  it('writes 77 over a FixtureID of 001 and counts the fixture as updated', async () => {
    const original = withIds('<FixtureID>001</FixtureID>');
    const { bytes, summary } = exportMvr(await renumbered(original, 1), { original });
    expect(texts(bytes, 'FixtureID')).toEqual(['77']);
    // FixtureIDNumeric is an MVR 1.6 element, so the export does not add one the file did not have
    expect(texts(bytes, 'FixtureIDNumeric')).toEqual([]);
    expect(summary.changes).toMatchObject({ updated: 1 });
  });

  it('keeps a textual FixtureID and writes the new number to FixtureIDNumeric', async () => {
    const original = withIds('<FixtureID>Spot 1</FixtureID><FixtureIDNumeric>5</FixtureIDNumeric>');
    const { bytes } = exportMvr(await renumbered(original, 5), { original });
    expect([texts(bytes, 'FixtureID'), texts(bytes, 'FixtureIDNumeric')]).toEqual([['Spot 1'], ['77']]);
  });

  it('keeps a FixtureID the import did not read as a number', async () => {
    // the import gave the fixture the lowest free id, 1, as "1.0" is not digits only
    const original = withIds('<FixtureID>1.0</FixtureID>');
    const { bytes, summary } = exportMvr(await renumbered(original, 1), { original });
    expect(texts(bytes, 'FixtureID')).toEqual(['1.0']);
    expect(summary.changes).toMatchObject({ updated: 0 });
  });
});
