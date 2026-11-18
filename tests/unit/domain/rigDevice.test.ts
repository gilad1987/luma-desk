/** A `device` (a hoist, a speaker, a hazer) is drawn and selectable, but it is no light and no screen. */
import { expect, it } from 'vitest';
import { isLight } from '../../../src/domain/rig/Rig';
import { rigFromDesign } from '../../../src/domain/stage/deriveRig';
import { selectIds } from '../../../src/domain/stage/query';
import { STANDARD_GROUPS } from '../../../src/domain/stage/standardGroups';
import { createTemplate } from '../../../src/domain/stage/templates';

const template = createTemplate('theatre');
const [first, ...rest] = template.fixtures;
if (first === undefined) throw new Error('the theatre template has no fixture');
const design = { ...template, fixtures: [{ ...first, type: 'device' as const }, ...rest] };
const rig = rigFromDesign(design);
const deviceId = first.id;

it('keeps a device out of the lights: select-all, the Everything group and the lights query', () => {
  const device = rig.get(deviceId);
  expect(device?.type).toBe('device');
  if (device) expect(isLight(device)).toBe(false);
  expect(rig.lightIds()).not.toContain(deviceId);
  expect(rig.lightIds().length).toBe(rig.fixtures.length - 1 - rig.idsOfType('screen').length);
  expect(selectIds(rig, design, { lights: true })).not.toContain(deviceId);
  const everything = STANDARD_GROUPS.find((group) => group.name === 'Everything');
  const ids = everything?.any.flatMap((q) => selectIds(rig, design, q)) ?? [];
  expect(ids.length).toBeGreaterThan(0);
  expect(ids).not.toContain(deviceId);
});

it('keeps a device out of the screens', () => {
  expect(rig.screenIds()).not.toContain(deviceId);
  expect(rig.screenIds()).toEqual(rig.idsOfType('screen'));
});
