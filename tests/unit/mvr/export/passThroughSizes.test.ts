// @vitest-environment jsdom
/** Review R2-3: a pass-through re-import is another program's file, so a body with no GDTF size gets a product size. */
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { exportMvr, importMvr } from '../../../../src/mvr/index.ts';
import { fx, passFile, passThroughMvr, passUuid as u } from '../../../shared/index.ts';

const SCENE = 'GeneralSceneDescription.xml';

/** How each body of `bytes` is drawn: `desk` is the desk model at its own size. */
const drawsOf = async (bytes: Uint8Array): Promise<string[]> =>
  [...(await importMvr(bytes, { name: 'b.mvr' })).bodies.values()].map((body) => body.draw);

/** The pass-through export of `original` as the desk imported it. */
const passThrough = async (original: Uint8Array): Promise<Uint8Array> =>
  exportMvr((await importMvr(original, { name: 'a.mvr' })).design, { original }).bytes;

/** `bytes` with the `originalProvider` taken out of the desk data, as an export before the marker wrote it. */
function withoutMarker(bytes: Uint8Array): Uint8Array {
  const files = unzipSync(bytes);
  const text = strFromU8(files[SCENE] ?? new Uint8Array());
  // the pass-through serializer leaves the quotes of text bare; the plain writer escapes them
  const old = text.replace(/,(&quot;|")originalProvider\1:\{[^}]*\}/, '');
  expect(old).not.toBe(text);
  return zipSync({ ...files, [SCENE]: strToU8(old) });
}

const noProvider = (): Uint8Array => passFile(fx(u(1), 1) + fx(u(2), 2));

describe('body sizes of a re-imported desk export (R2-3)', () => {
  it('keeps the desk size for a plain desk export', async () => {
    const design = (await importMvr(noProvider(), { name: 'a.mvr' })).design;
    const draws = await drawsOf(exportMvr(design).bytes);
    expect(draws.length).toBeGreaterThan(0);
    expect(draws.every((draw) => draw === 'desk')).toBe(true);
  });

  it.each([
    ['with a root provider', passThroughMvr],
    ['without a root provider', noProvider],
  ])('gives a product size after a pass-through export of a file %s', async (_label, make) => {
    const first = await drawsOf(make());
    expect(first.length).toBeGreaterThan(0);
    expect(first.every((draw) => draw !== 'desk')).toBe(true);
    expect(await drawsOf(await passThrough(make()))).toEqual(first);
  });

  it('keeps the product size through a second pass-through export', async () => {
    const once = await passThrough(noProvider());
    const twice = exportMvr((await importMvr(once, { name: 'b.mvr' })).design, { original: once }).bytes;
    expect(await drawsOf(twice)).toEqual(await drawsOf(noProvider()));
  });

  it('draws an older pass-through export without the marker as before, at the desk size', async () => {
    const draws = await drawsOf(withoutMarker(await passThrough(noProvider())));
    expect(draws.every((draw) => draw === 'desk')).toBe(true);
  });
});
