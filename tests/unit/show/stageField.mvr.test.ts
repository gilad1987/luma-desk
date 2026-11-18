/**
 * The MVR fields of a stored design (`StageFixture.patch`, `StageDesign.mvr`, contract Amendment 3) go through the
 * real show save and load: the stage parser keeps only known keys, so a field it does not read is lost on reload.
 */
import { describe, expect, it } from 'vitest';
import { jsonRoundTrip } from '../../shared';
import { importedDesign } from './importedDesign';
import { BAD_STAGE, stageWorld } from './stageWorld';

/** A complete MVR fixture entry, so only its missing fixture can reject it. */
const ORPHAN = { uuid: 'F-9', layer: 'L-1', gdtfName: 'Spot', gdtfMode: 'Mode 1', type: 'spot' };

describe('show stage field: MVR fields', () => {
  it('a design with patch and mvr survives save -> JSON -> load deep-equal', () => {
    const design = importedDesign();
    const source = stageWorld();
    source.serializer.load({ stage: jsonRoundTrip(design) });
    const saved = source.json();
    const world = stageWorld();
    world.serializer.load(JSON.parse(saved));
    expect(world.service.design).toEqual(design);
    expect(world.json()).toBe(saved);
    expect([...source.messages, ...world.messages]).toEqual([]);
  });

  it('a bad patch rejects the stage like any other bad field', () => {
    const design = importedDesign();
    const [first, ...rest] = design.fixtures;
    const bad = { ...design, fixtures: [{ ...first, patch: { universe: 0, address: 1, mode: 'x' } }, ...rest] };
    const world = stageWorld();
    world.serializer.load({ stage: jsonRoundTrip(bad) });
    expect(world.service.isBuiltIn).toBe(true);
    expect(world.messages).toEqual([{ kind: 'toast', text: BAD_STAGE }]);
  });

  it.each([
    ['a short offset', { offset: [0, 0] }],
    ['an entry for a fixture the design does not have', { fixtures: { '9999': ORPHAN } }],
  ])('a bad mvr block (%s) rejects the stage', (_, change) => {
    const design = importedDesign();
    const bad = { ...design, mvr: { ...design.mvr, ...change } };
    const world = stageWorld();
    world.serializer.load({ stage: jsonRoundTrip(bad) });
    expect(world.service.isBuiltIn).toBe(true);
    expect(world.messages).toEqual([{ kind: 'toast', text: BAD_STAGE }]);
  });
});
