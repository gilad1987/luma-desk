import type { StageDesign } from '../../../src/domain/stage/StageDesign.ts';
import { fixtureKey } from '../../../src/mvr/design/fixtureKey.ts';
import { importMvr } from '../../../src/mvr/index.ts';

/**
 * `design` as a show saved it when the import did not give the desk the fixtures that are no lights (a hoist): no
 * desk fixture, no MVR facts and no entry in the list of imported fixtures for them. The pass-through export must
 * keep such a `<Fixture>` element of the original file, with its addresses, as it is.
 */
export function withoutDevices(design: StageDesign): StageDesign {
  const { mvr } = design;
  if (!mvr) return design;
  const gone = new Set(design.fixtures.filter((fixture) => fixture.type === 'device').map((fixture) => fixture.id));
  const goneKeys = new Set(
    [...gone].map((id) => {
      const info = mvr.fixtures[String(id)];
      return info ? fixtureKey(info.uuid, info.occurrence ?? 0) : '';
    }),
  );
  const facts = Object.entries(mvr.fixtures).filter(([id]) => !gone.has(Number(id)));
  const imported = mvr.imported?.filter((key) => !goneKeys.has(key));
  return {
    ...design,
    fixtures: design.fixtures.filter((fixture) => !gone.has(fixture.id)),
    mvr: { ...mvr, fixtures: Object.fromEntries(facts), ...(imported ? { imported } : {}) },
  };
}

/** Imports `original` and gives the design without its devices (`withoutDevices`). */
export async function loadNoDevices(original: Uint8Array): Promise<StageDesign> {
  return withoutDevices((await importMvr(original, { name: 'a.mvr' })).design);
}
