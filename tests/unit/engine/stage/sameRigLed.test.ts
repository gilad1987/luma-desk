/** A layer marked as an LED wall is the user's view of the file, not rig data: it must not ask for a rig rebuild. */
import { expect, it } from 'vitest';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { isSameRig } from '../../../../src/engine/stage/sameRig';

it('takes designs that differ only in hidden and LED layers as one rig', () => {
  const mvr = { fixtures: {}, layers: [{ uuid: 'L', name: 'Wall' }], hiddenLayers: [], offset: [0, 0, 0] } as const;
  const design: StageDesign = { ...createTemplate('theatre'), mvr };
  expect(isSameRig(design, { ...design, mvr: { ...mvr, ledLayers: ['L'] } })).toBe(true);
  expect(
    isSameRig({ ...design, mvr: { ...mvr, ledLayers: ['L'] } }, { ...design, mvr: { ...mvr, hiddenLayers: ['L'] } }),
  ).toBe(true);
  expect(isSameRig(design, { ...design, mvr: { ...mvr, offset: [1, 0, 0] } })).toBe(false);
});
