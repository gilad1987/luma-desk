/**
 * The end of a universe: a fixture that would start past channel 512 starts the next universe, also when it takes no
 * channel. A zero-channel device after a full universe got address 513, which no patch can hold, and the export threw.
 */
import { describe, expect, it } from 'vitest';
import type { DmxPatch } from '../../../../src/domain/stage/DmxPatch.ts';
import type { StageFixture } from '../../../../src/domain/stage/StageDesign.ts';
import { assignPatches } from '../../../../src/mvr/export/assignPatches.ts';
import { footprintOf } from '../../../../src/mvr/export/modeFootprints.ts';

const fixture = (id: number, type: StageFixture['type']): StageFixture => ({
  id,
  type,
  role: 'front',
  trussId: null,
  position: [0, 0, 0],
  mount: 'hang',
});

const blinders = (count: number): StageFixture[] =>
  Array.from({ length: count }, (_, index) => fixture(index + 1, 'blinder'));

function patch(open: readonly StageFixture[]): Map<number, DmxPatch> {
  const patches = new Map<number, DmxPatch>();
  assignPatches(open, undefined, patches, { first: 1, placeEstimates: true });
  return patches;
}

describe('assignPatches at the end of a universe', () => {
  it('measures a blinder as 4 channels and a device as none, so 128 blinders fill universe 1', () => {
    expect([footprintOf(fixture(1, 'blinder'), undefined), footprintOf(fixture(2, 'device'), undefined)]).toMatchObject(
      [{ channels: 4 }, { channels: 0 }],
    );
    expect(patch(blinders(128)).get(128)).toMatchObject({ universe: 1, address: 509 });
  });

  it('gives a zero-channel device after a full universe address 1 of the next universe', () => {
    expect(patch([...blinders(128), fixture(129, 'device')]).get(129)).toMatchObject({ universe: 2, address: 1 });
  });

  it('keeps a zero-channel device in the universe while its address is 512 or lower', () => {
    expect(patch([...blinders(127), fixture(128, 'device')]).get(128)).toMatchObject({ universe: 1, address: 509 });
  });
});
