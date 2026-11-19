// @vitest-environment jsdom
/**
 * A `<Connection toObject>` may write the uuid of its fixture in another letter case or as spaced byte pairs: only
 * the hex digits tell two uuids apart (`uuidKey`), so such a connection to a deleted fixture is removed too.
 */
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { exportMvr, importMvr } from '../../../../src/mvr/index.ts';
import { fx, passFile, passUuid as u } from '../../../shared/index.ts';

const A = (n: number): string => `<Address break="0">${n}</Address>`;
/** Fixture `n` with one connection to the object `to`. */
const connected = (n: number, to: string): string =>
  fx(u(n), n, { addresses: A(n * 100) }).replace(
    '</Addresses>',
    `</Addresses><Connections><Connection own="1" other="1" toObject="${to}"/></Connections>`,
  );
const SPACED = u(1)
  .replace(/-/g, '')
  .replace(/(..)(?=.)/g, '$1 ');

describe('a connection to a deleted fixture in a pass-through export', () => {
  it('is removed when its toObject differs from the uuid of the fixture only in case or spacing', async () => {
    const lower = connected(2, u(1).toLowerCase());
    const original = passFile(fx(u(1), 1, { addresses: A(1) }) + lower + connected(3, SPACED) + connected(4, u(2)));
    const { design } = await importMvr(original, { name: 'a.mvr' });
    const fixtures = design.fixtures.filter((fixture) => fixture.id !== 1);
    const { bytes, summary } = exportMvr({ ...design, fixtures }, { original });
    const xml = strFromU8(unzipSync(bytes)['GeneralSceneDescription.xml'] ?? new Uint8Array());
    expect(xml.match(/<Connection /g)).toHaveLength(1);
    expect(xml).toContain(`toObject="${u(2)}"`);
    expect(summary.report.warnings.map((item) => item.text)).toContain(
      '2 connections to fixtures deleted on the desk were removed.',
    );
  });
});
