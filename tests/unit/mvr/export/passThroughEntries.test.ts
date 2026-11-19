// @vitest-environment jsdom
/** Third review, N10: many archive entries of one kind are one summary line with the count and the full list. */
import { strToU8, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { exportMvr, importMvr } from '../../../../src/mvr/index.ts';
import { fx, passScene, passUuid as u } from '../../../shared/index.ts';

describe('archive entries in the pass-through summary (N10)', () => {
  it('groups the entries with an unsafe path into one loss line', async () => {
    const original = zipSync({
      'GeneralSceneDescription.xml': strToU8(passScene(fx(u(1), 1, { addresses: '<Address>1</Address>' }))),
      '../a.txt': strToU8('a'),
      '../b.txt': strToU8('b'),
    });
    const { design } = await importMvr(original, { name: 'a.mvr' });
    const [only, ...rest] = exportMvr(design, { original }).summary.report.losses;
    const start =
      '2 files are not in this export because their paths point outside the archive. For example: The file "../a.txt"';
    expect(rest).toEqual([]);
    expect(only?.text.startsWith(start)).toBe(true);
    expect(only?.all).toEqual([
      'The file "../a.txt" is not in this export: its path points outside the archive.',
      'The file "../b.txt" is not in this export: its path points outside the archive.',
    ]);
  });
});
