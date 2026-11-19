// @vitest-environment jsdom
/** Review #6: of two masters with one attribute, the condition's own master gives the default state. */
import { describe, expect, it } from 'vitest';
import { gdtfFunctionMode, opticsOf } from '../../shared/index.ts';

const SPOT = 'Name="Spot" PhysicalFrom="40" PhysicalTo="10" ModeMaster="B_Gobo1" ModeFrom="0/1" ModeTo="127/1"';
const BEAM =
  '<ChannelFunction Name="Beam" Attribute="Zoom" PhysicalFrom="21" PhysicalTo="2" ModeMaster="B_Gobo1" ' +
  'ModeFrom="128/1" ModeTo="255/1"/>';
const masterA = { attribute: 'Gobo1', offset: '1', geometry: 'A', fn: 'Default="0/1"' };
const masterB = { attribute: 'Gobo1', offset: '2', geometry: 'B', fn: 'Default="200/1"' };

describe('zoom of a fixture with two Gobo1 masters (review #6)', () => {
  for (const [label, masters] of [
    ['A first', [masterA, masterB]],
    ['B first', [masterB, masterA]],
  ] as const) {
    it(`takes the range master B's default selects, with ${label}`, () => {
      const zoom = { attribute: 'Zoom', offset: '3', fn: SPOT, more: BEAM };
      const { optics } = opticsOf({ modes: gdtfFunctionMode('Std', [...masters, zoom]) });
      expect(optics?.zoom?.when).toMatchObject({ attribute: 'Gobo1', dmxFrom: 128, dmxTo: 255 });
      expect(optics?.zoom?.when?.drives).toEqual([{ dmxBreak: 1, offset: [2] }]);
    });
  }
});
