// @vitest-environment jsdom
/** Second review, L-c, L-d and L-e: the import's walk order, an integer occurrence, and the bytes of the scene file. */
import { strToU8, unzipSync, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { parseStageDesign } from '../../../../src/domain/stage/parse/parseStageDesign.ts';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign.ts';
import { exportMvr, importMvr } from '../../../../src/mvr/index.ts';
import { parseXml } from '../../../../src/mvr/xml/parseXml.ts';
import { fx, makeMvr, passFile, passScene, passUuid as u } from '../../../shared/index.ts';

const SCENE = 'GeneralSceneDescription.xml';
const GDTF = { 'Test@Spot.gdtf': strToU8('not a real gdtf') };
/** The scene file as text, its byte order mark kept as a character. */
const sceneText = (bytes: Uint8Array): string =>
  new TextDecoder('utf-8', { ignoreBOM: true }).decode(unzipSync(bytes)[SCENE] ?? new Uint8Array());
const load = async (original: Uint8Array): Promise<StageDesign> =>
  (await importMvr(original, { name: 'a.mvr' })).design;
const A = (text: string): string => `<Address break="0">${text}</Address>`;

describe('pass-through walk order and bytes', () => {
  it('leaves a Fixture outside a ChildList alone and edits the one the import read (L-c)', async () => {
    const stray = fx(u(1), 1, { addresses: A('1') });
    const scene = passScene(fx(u(1), 2, { addresses: A('101') })).replace('<ChildList>', `${stray}<ChildList>`);
    const original = makeMvr(scene, GDTF);
    const design = await load(original);
    const fixtures = design.fixtures.map((fixture) => ({ ...fixture, patch: { universe: 9, address: 9, mode: '' } }));
    const { bytes, summary } = exportMvr({ ...design, fixtures }, { original });
    const written = Array.from(parseXml(sceneText(bytes)).getElementsByTagName('Address'), (el) => el.textContent);
    expect(design.fixtures.map((fixture) => fixture.id)).toEqual([2]);
    expect(written).toEqual(['1', String(8 * 512 + 9)]);
    expect(summary.changes).toMatchObject({ updated: 1, added: 0, removed: 0 });
  });

  it('rejects an occurrence that is not a whole number in a stored show (L-d)', async () => {
    const original = passFile(fx(u(1), 1, { addresses: A('1') }) + fx(u(1), 2, { addresses: A('101') }));
    const stored = JSON.parse(JSON.stringify(await load(original))) as StageDesign;
    const twin = stored.mvr?.fixtures['2'];
    const withOccurrence = (occurrence: number): unknown => ({
      ...stored,
      mvr: { ...stored.mvr, fixtures: { ...stored.mvr?.fixtures, '2': { ...twin, occurrence } } },
    });
    expect(twin?.occurrence).toBe(1);
    expect(parseStageDesign(withOccurrence(1)).ok).toBe(true);
    expect(parseStageDesign(withOccurrence(1.5)).ok).toBe(false);
  });

  it('keeps the byte order mark and CRLF line ends of the scene, and writes an empty element short (L-e)', async () => {
    const text = passScene(fx(u(1), 1, { addresses: A('1') })).replace('<AUXData/>', '<AUXData></AUXData>\n');
    const marked = new Uint8Array([0xef, 0xbb, 0xbf, ...strToU8(text.replace(/\n/g, '\r\n'))]);
    const original = zipSync({ [SCENE]: marked, ...GDTF });
    const { bytes, summary } = exportMvr(await load(original), { original });
    const written = sceneText(bytes);
    expect(summary.changes).toMatchObject({ updated: 0, added: 0, removed: 0 });
    expect(written.charCodeAt(0) === 0xfeff && written.startsWith('<?xml', 1)).toBe(true);
    expect(written).toContain('\r\n');
    expect(/(^|[^\r])\n/.test(written)).toBe(false);
    expect(written).toContain('<AUXData/>');
    expect(written).not.toContain('<AUXData></AUXData>');
  });

  it('writes LF and no byte order mark for a scene that had LF and none (L-e)', async () => {
    const original = passFile(fx(u(1), 1, { addresses: A('1') }));
    const written = sceneText(exportMvr(await load(original), { original }).bytes);
    expect(written.startsWith('<?xml')).toBe(true);
    expect(written).not.toContain('\r');
  });
});
