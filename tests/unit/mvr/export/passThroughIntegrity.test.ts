// @vitest-environment jsdom
/** Audit B3 and B4: what a re-type keeps and what a delete must not leave dangling, each said in the summary. */
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import type { FixtureTypeId } from '../../../../src/domain/FixtureType.ts';
import { TYPES } from '../../../../src/domain/fixtureTypes/index.ts';
import { exportMvr, importMvr, type MvrExport } from '../../../../src/mvr/index.ts';
import { fx, passFile, passUuid as u } from '../../../shared/index.ts';

const A = (n: number): string => `<Address break="0">${n}</Address>`;
const BOUND =
  '<Alignments><Alignment geometry="Beam" up="0,0,1" direction="0,0,-1"/></Alignments>' +
  '<Overwrites><Overwrite universal="Universal Wheel 1.Universal Gobo 1" target="Wheel 1.Gobo 2"/></Overwrites>';
/** Fixture `n` with `extra` children after its addresses and optional nested objects. */
const one = (n: number, extra = '', children = ''): string =>
  fx(u(n), n, { addresses: A(n * 100), ...(children ? { children } : {}) }).replace(
    '</Addresses>',
    `</Addresses>${extra}`,
  );
const sceneText = (bytes: Uint8Array): string =>
  strFromU8(unzipSync(bytes)['GeneralSceneDescription.xml'] ?? new Uint8Array());
const warningsOf = ({ summary }: MvrExport): string[] => summary.report.warnings.map((item) => item.text);

/** The export of `original` after `edit` changed the imported fixtures. */
async function exported(original: Uint8Array, drop: readonly number[], type?: FixtureTypeId): Promise<MvrExport> {
  const { design } = await importMvr(original, { name: 'a.mvr' });
  const kept = design.fixtures.filter((fixture) => !drop.includes(fixture.id));
  const fixtures = kept.map((fixture) => (type && fixture.id === 1 ? { ...fixture, type } : fixture));
  return exportMvr({ ...design, fixtures }, { original });
}

describe('a re-typed fixture in a pass-through export (B3)', () => {
  it('keeps the children that name the earlier GDTF and reports them and the missing new GDTF as warnings', async () => {
    const original = passFile(one(1, BOUND) + one(2));
    const { design } = await importMvr(original, { name: 'a.mvr' });
    const other = (Object.keys(TYPES) as FixtureTypeId[]).find(
      (type) => type !== design.fixtures[0]?.type && TYPES[type].gdtfSpec?.includes('@Robin'),
    );
    const result = await exported(original, [], other);
    const spec = TYPES[other ?? 'spot'].gdtfSpec ?? '';
    expect(sceneText(result.bytes)).toContain(BOUND);
    expect(warningsOf(result)).toEqual([
      `GDTF files of re-typed fixtures are not in this export; get them from GDTF-Share: ${spec}.`,
      '1 re-typed fixtures keep data that names their earlier GDTF (Alignments, Overwrites); check them in the ' +
        'target application.',
    ]);
    expect(result.summary.report.information.some((item) => item.text.includes(spec))).toBe(false);
    expect(warningsOf(await exported(original, []))).toEqual([]);
  });
});

describe('a deleted fixture in a pass-through export (B4)', () => {
  const cable = (to: number): string =>
    `<Connections><Connection own="Out" toObject="${u(to)}" other="In"/></Connections>`;

  it('removes the connections of other objects to it, and only those', async () => {
    const original = passFile(
      one(1) +
        one(
          2,
          cable(1).replace('</Connections>', `<Connection own="B" toObject="${u(3)}" other="In"/></Connections>`),
        ) +
        one(3),
    );
    const result = await exported(original, [1]);
    const text = sceneText(result.bytes);
    expect(text).not.toContain(`toObject="${u(1)}"`);
    expect(text).toContain(`<Connection own="B" toObject="${u(3)}" other="In"/>`);
    expect(warningsOf(result)).toEqual(['1 connections to fixtures deleted on the desk were removed.']);
  });

  it('keeps a multipatch child of it as written and reports that it lost its parent', async () => {
    const child = one(2).replace('<Fixture ', `<Fixture multipatch="${u(1)}" `);
    const result = await exported(passFile(one(1) + child), [1]);
    expect(sceneText(result.bytes)).toContain(`<Fixture multipatch="${u(1)}" uuid="${u(2)}"`);
    expect(warningsOf(result)).toHaveLength(1);
    expect(warningsOf(result)[0]).toContain('1 multipatch fixtures lost their parent');
  });

  it('takes the ChildPosition off a child moved out of it and reports it', async () => {
    const child = one(2, '').replace('<Addresses>', '<ChildPosition>Base.Yoke</ChildPosition><Addresses>');
    const result = await exported(passFile(one(1, '', child) + one(3, '<ChildPosition>Pipe</ChildPosition>')), [1]);
    const text = sceneText(result.bytes);
    expect(text).not.toContain('Base.Yoke');
    expect(text).toContain(`uuid="${u(2)}"`);
    expect(text).toContain('<ChildPosition>Pipe</ChildPosition>');
    expect(warningsOf(result)).toEqual([
      '1 objects moved out of a deleted fixture lost their ChildPosition, which named a geometry of that fixture.',
    ]);
  });
});
