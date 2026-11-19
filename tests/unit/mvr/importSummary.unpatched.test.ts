// @vitest-environment jsdom
/** Review #2: the summary counts the fixtures the design holds unpatched, after the desk's own data took patches off. */
import { describe, expect, it } from 'vitest';
import { exportMvr, importMvr } from '../../../src/mvr/index.ts';
import { fx, passFile, passUuid as u } from '../../shared/index.ts';

const address = (text: string, dmxBreak = 0): string => `<Address break="${dmxBreak}">${text}</Address>`;

describe('import summary of a fixture the desk wrote unpatched (review #2)', () => {
  it('counts the fixture as unpatched, as the design holds it', async () => {
    const twoBreaks = passFile(fx(u(1), 1, { addresses: address('1.1') + address('1.300', 1) }));
    const first = await importMvr(twoBreaks, { name: 'a.mvr' });
    const fixtures = first.design.fixtures.map(({ patch: _patch, ...rest }) => rest);
    const { bytes } = exportMvr({ ...first.design, fixtures }, { original: twoBreaks });
    const again = await importMvr(bytes, { name: 'b.mvr' });
    const unpatched = again.design.fixtures.filter((fixture) => fixture.patch === undefined).length;
    expect(unpatched).toBe(1);
    expect(again.summary.unpatchedCount).toBe(unpatched);
  });
});
