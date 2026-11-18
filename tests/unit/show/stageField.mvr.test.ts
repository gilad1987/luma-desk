/**
 * The MVR fields of a stored design (`StageFixture.patch`, `StageDesign.mvr`, contract Amendment 3) go through the
 * real show save and load: the stage parser keeps only known keys, so a field it does not read is lost on reload.
 */
import { describe, expect, it } from 'vitest';
import type { StageDesign } from '../../../src/domain/stage/StageDesign';
import { createTemplate } from '../../../src/domain/stage/templates';
import { jsonRoundTrip } from '../../shared';
import { BAD_STAGE, stageWorld } from './stageWorld';

/** The theatre template as an MVR import leaves it: every fixture patched, the first one with its MVR facts. */
function importedDesign(): StageDesign {
  const theatre = createTemplate('theatre');
  const fixtures = theatre.fixtures.map((fixture, index) => ({
    ...fixture,
    patch: { universe: index + 1, address: 1 + index, mode: 'Mode 1' },
  }));
  const infos = fixtures.slice(0, 1).map((fixture) => {
    const info = { uuid: 'F-1', layer: 'L-1', gdtfName: 'Spot', gdtfMode: 'Mode 1', type: fixture.type };
    return [String(fixture.id), { ...info, focus: [1, 0, -2], footprint: 17 }] as const;
  });
  const layers = [{ uuid: 'L-1', name: 'Rig' }];
  const mvr = { fixtures: Object.fromEntries(infos), layers, hiddenLayers: ['L-1'], offset: [0.5, 0, -1] } as const;
  return { ...theatre, fixtures, mvr };
}

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
