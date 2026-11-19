import { expect, it } from 'vitest';
import { rigFromDesign } from '../../../src/domain/stage/deriveRig';
import { frameOf } from '../../../src/domain/stage/StageFrame';
import { createTemplate } from '../../../src/domain/stage/templates';
import { buildMvrFirstLook } from '../../../src/show/mvrLook/mvrFirstLook';

it('gives a device (a hoist, a hazer) no level and no value in the first look', () => {
  const template = createTemplate('theatre');
  const [first, ...rest] = template.fixtures;
  if (first === undefined) throw new Error('the theatre template has no fixture');
  const design = { ...template, fixtures: [{ ...first, type: 'device' as const }, ...rest] };
  const rig = rigFromDesign(design);
  const cue = buildMvrFirstLook({ rig, frame: frameOf(design) });
  const device = rig.fixtures.find((f) => f.type === 'device');
  expect(device?.id).toBe(first.id);
  expect(device?.T.attrs).toEqual([]);
  expect(cue?.vals[first.id]).toBeUndefined();
  expect(Object.keys(cue?.vals ?? {}).length).toBeGreaterThan(0);
});
