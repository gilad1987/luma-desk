// @vitest-environment jsdom
/**
 * An export whose stored patch sits at the top universe: the auto-patch has no room for the unpatched fixtures, so
 * the export must still finish, write them without an address and say so in its notes.
 */
import { describe, expect, it } from 'vitest';
import { exportMvr } from '../../../../src/mvr/export/exportMvr.ts';
import { importMvr } from '../../../../src/mvr/index.ts';
import { makeMvr, sceneXml } from '../../../shared/index.ts';

const uuid = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

/** A fixture without a GDTF file; `universe` patches it at address 1 of that universe, else it is unpatched. */
function fixtureXml(id: number, universe?: number): string {
  const address =
    universe === undefined ? '' : `<Addresses><Address break="0">${(universe - 1) * 512 + 1}</Address></Addresses>`;
  return (
    `<Fixture uuid="${uuid(id)}" name="F${id}"><Matrix>{1,0,0}{0,1,0}{0,0,1}{${id * 100},0,6000}</Matrix>` +
    `<GDTFSpec>Acme@Spot</GDTFSpec><GDTFMode>Std</GDTFMode><FixtureID>${id}</FixtureID>${address}</Fixture>`
  );
}

/** The design of a file with fixture 1 patched at `universe` and fixtures 2 to `count` unpatched. */
async function rig(universe: number, count: number): Promise<Awaited<ReturnType<typeof importMvr>>['design']> {
  const fixtures = Array.from({ length: count }, (_, i) => fixtureXml(i + 1, i === 0 ? universe : undefined));
  const layer = `<Layer uuid="${uuid(0)}" name="Rig"><ChildList>${fixtures.join('')}</ChildList></Layer>`;
  return (await importMvr(makeMvr(sceneXml(layer)), { name: 'top.mvr' })).design;
}

describe('MVR export at the top universe', () => {
  it('exports a patch at universe 63999 and leaves the unpatched fixtures without an address', async () => {
    const design = await rig(63_999, 3);
    const exported = exportMvr(design);
    expect(exported.summary.autoPatched).toBe(0);
    expect(exported.summary.notes).toContain(
      '2 fixtures had no DMX patch and no free universe up to 63999; they have no address.',
    );
    const again = (await importMvr(exported.bytes, { name: 'again.mvr' })).design.fixtures;
    const patches = Object.fromEntries(again.map((fixture) => [fixture.id, fixture.patch?.universe ?? null]));
    expect(patches).toEqual({ 1: 63_999, 2: null, 3: null });
  });

  it('fills universe 63999 after a patch at 63998 and counts the rest as unplaced', async () => {
    const design = await rig(63_998, 601);
    const exported = exportMvr(design);
    const { autoPatched } = exported.summary;
    const again = (await importMvr(exported.bytes, { name: 'again.mvr' })).design.fixtures;
    const universes = again.flatMap((fixture) => (fixture.id > 1 && fixture.patch ? [fixture.patch.universe] : []));
    expect([universes.length, new Set(universes)]).toEqual([autoPatched, new Set([63_999])]);
    expect(autoPatched).toBeGreaterThan(0);
    const unplaced =
      `${600 - autoPatched} fixtures had no DMX patch and no free universe up to 63999; ` + 'they have no address.';
    expect(autoPatched < 600 && exported.summary.notes.includes(unplaced)).toBe(true);
  });
});
