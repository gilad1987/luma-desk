/**
 * Owns the `mvr.fixtures` rule of the edits that delete fixtures: the entry of a deleted fixture goes with it, because
 * the parser rejects an entry without its fixture and the export must not carry a dead fixture's MVR identity.
 */
import { describe, expect, it } from 'vitest';
import { deleteFixtures, deleteTruss } from '../../../../../src/domain/stage/edit/itemOps.ts';
import { setLedWall } from '../../../../../src/domain/stage/edit/ledWall.ts';
import type { MvrFixtureInfo } from '../../../../../src/domain/stage/mvr.ts';
import type { StageDesign } from '../../../../../src/domain/stage/StageDesign.ts';
import { sampleDesign } from './sampleDesign.ts';

/** `d` as an MVR import leaves it: every fixture has an `mvr.fixtures` entry. */
function imported(d: StageDesign): StageDesign {
  const entry = (id: number): [string, MvrFixtureInfo] => {
    const info: MvrFixtureInfo = { uuid: `U-${id}`, layer: 'L', gdtfName: 'G', gdtfMode: 'M', type: 'wash' };
    return [String(id), info];
  };
  const fixtures = Object.fromEntries(d.fixtures.map((f) => entry(f.id)));
  return { ...d, mvr: { fixtures, layers: [], hiddenLayers: [], offset: [0, 0, 0] } };
}

const entryIds = (d: StageDesign): string[] => Object.keys(d.mvr?.fixtures ?? {});

describe('deleting fixtures drops their mvr entries', () => {
  it('deleteFixtures drops the entries of the deleted fixtures and keeps the rest', () => {
    const next = deleteFixtures(imported(sampleDesign()), [101, 301]);
    expect(entryIds(next)).toEqual(['102', '201']);
    expect(next.mvr?.layers).toEqual([]);
  });

  it('deleteTruss drops the entries of the fixtures on the truss', () => {
    expect(entryIds(deleteTruss(imported(sampleDesign()), 'pipe-1'))).toEqual(['201', '301']);
  });

  it('turning the LED wall off drops the entry of its screen fixture', () => {
    const withWall = imported(setLedWall(sampleDesign(), { width: 4, height: 3 }));
    const wallId = withWall.screens[0]?.fixtureId;
    expect(entryIds(withWall)).toContain(String(wallId));
    expect(entryIds(setLedWall(withWall, null))).toEqual(['101', '102', '201', '301']);
  });

  it('a design without mvr gets no mvr key', () => {
    expect('mvr' in deleteFixtures(sampleDesign(), [101])).toBe(false);
  });
});
