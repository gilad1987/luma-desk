/**
 * `<Classing>` and `<Position>` references in the spaced byte pairs of the MVR 1.6 Fixture example
 * (`77 BC DE 16 ...`): the import matches them by their hex digits, so the plain export writes them again, in the
 * `XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX` form the spec's UUID type gives, and does not report them as dangling.
 */
import { describe, expect, it } from 'vitest';
import type { MvrDesignInfo } from '../../../../src/domain/stage/mvr.ts';
import { auxNameNodes, auxUuid } from '../../../../src/mvr/export/fixtureFileData.ts';

const SPACED = '77 BC DE 16 95 A6 47 25 9D 04 16 A0 BD 67 CD 1A';
const HYPHENATED = '77bcde16-95a6-4725-9d04-16a0bd67cd1a';

describe('auxUuid', () => {
  it('writes a spaced reference in the hyphenated form', () => {
    expect(auxUuid({ uuid: SPACED, name: 'LX 1' })).toBe(HYPHENATED);
  });

  it('keeps a hyphenated uuid as the file wrote it', () => {
    expect(auxUuid({ uuid: HYPHENATED.toUpperCase(), name: 'LX 1' })).toBe(HYPHENATED.toUpperCase());
  });

  it.each([
    ['a dangling reference', { uuid: SPACED }],
    ['a reference of too few digits', { uuid: '77 BC DE 16', name: 'LX 1' }],
    ['the nil uuid', { uuid: Array.from({ length: 16 }, () => '00').join(' '), name: 'LX 1' }],
  ])('writes nothing for %s', (_, entry) => {
    expect(auxUuid(entry)).toBeUndefined();
  });

  it('writes one Position node for the spaced and the hyphenated form of one uuid', () => {
    const mvr = {
      positions: [
        { uuid: SPACED, name: 'LX 1' },
        { uuid: HYPHENATED, name: 'LX 1' },
      ],
    };
    const nodes = auxNameNodes(mvr as Partial<MvrDesignInfo> as MvrDesignInfo);
    expect(nodes).toHaveLength(1);
    expect(nodes[0]).toContain(`uuid="${HYPHENATED}"`);
  });
});
