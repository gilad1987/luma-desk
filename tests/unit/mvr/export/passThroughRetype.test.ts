// @vitest-environment jsdom
/** Third review: a re-type alone must not move the file's insertion point; the mount shift depends on the desk type. */
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import type { FixtureTypeId } from '../../../../src/domain/FixtureType.ts';
import { TYPES } from '../../../../src/domain/fixtureTypes/index.ts';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign.ts';
import { exportMvr, importMvr } from '../../../../src/mvr/index.ts';
import { walkScene } from '../../../../src/mvr/scene/walkScene.ts';
import { parseXml } from '../../../../src/mvr/xml/parseXml.ts';
import { fx, passFile, passUuid as u } from '../../../shared/index.ts';

const sceneOf = (bytes: Uint8Array): Document =>
  parseXml(strFromU8(unzipSync(bytes)['GeneralSceneDescription.xml'] ?? new Uint8Array()));
const matrices = (bytes: Uint8Array): (string | null)[] =>
  Array.from(sceneOf(bytes).getElementsByTagName('Matrix'), (el) => el.textContent);
const one = (n: number): string =>
  fx(u(n), n, { at: `{1,0,0}{0,1,0}{0,0,1}{${n * 1000},500,6000}`, addresses: `<Address>${n * 100}</Address>` });
const original = passFile(one(1) + one(2) + one(3));
const load = async (): Promise<StageDesign> => (await importMvr(original, { name: 'a.mvr' })).design;
const retyped = (design: StageDesign, type: FixtureTypeId): StageDesign => ({
  ...design,
  fixtures: design.fixtures.map((fixture) => ({ ...fixture, type })),
});
/** Every desk type that names a GDTF, so each mount shift the desk has is tried. */
const named = (Object.keys(TYPES) as FixtureTypeId[]).filter((type) => TYPES[type].gdtfSpec);

describe('pass-through re-type and the insertion point', () => {
  it.each(named)('keeps every Matrix text when the user only re-typed the fixtures to %s', async (type) => {
    const design = await load();
    const { bytes, summary } = exportMvr(retyped(design, type), { original });
    expect(matrices(bytes)).toEqual(matrices(original));
    expect(summary.changes?.moved).toBe(0);
  });

  it('moves the insertion point of a re-typed fixture by the move the user made, and no more', async () => {
    const design = await load();
    const other = named.find((type) => type !== design.fixtures[0]?.type) ?? 'screen';
    const moved = retyped(design, other);
    const fixtures = moved.fixtures.map((fixture) => ({
      ...fixture,
      position: [fixture.position[0] + 1, fixture.position[1], fixture.position[2]] as const,
    }));
    const world = (bytes: Uint8Array): number[][] =>
      walkScene(sceneOf(bytes)).fixtures.map((record) => [...record.matrix.slice(12, 15)]);
    const after = world(exportMvr({ ...moved, fixtures }, { original }).bytes);
    const delta = world(original).map((point, index) =>
      point.map((v, axis) => Math.round((after[index]?.[axis] ?? 0) - v)),
    );
    expect(delta).toEqual([
      [1000, 0, 0],
      [1000, 0, 0],
      [1000, 0, 0],
    ]);
  });
});
