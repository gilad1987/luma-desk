import type { StageDesign } from '../../../src/domain/stage/StageDesign';
import { createTemplate } from '../../../src/domain/stage/templates';

/** The theatre template as an MVR import leaves it: every fixture patched, the first one with its MVR facts. */
export function importedDesign(): StageDesign {
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
