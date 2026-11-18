import { expect, it } from 'vitest';
import { lookGroupsOf } from '../../../src/show/mvrLook/lookGroups';
import { systemOf } from '../../../src/show/mvrLook/rigSystems';
import { AREA, fx } from './lookRig';

it('takes a device out of every system, and a hoist above a wash does not make it a tower unit', () => {
  // a wash on the side of the deck with a hoist 2 m above it: no light stack, so it stays overhead
  const wash = fx(1, 'wash', [6, 6, 0]);
  const hoist = fx(2, 'device', [6, 8, 0]);
  const speaker = fx(3, 'device', [0, 1.5, 4]);
  const rig = [wash, hoist, speaker];
  expect(rig.map(systemOf(AREA, rig))).toEqual(['overhead', 'none', 'none']);
  const g = lookGroupsOf(AREA, rig);
  const all = [g.key, g.frontFixed, g.follow, g.tone, g.cross, g.fans, g.towers, g.ups, g.bars, g.blinders, g.statics];
  expect(all.flat().map((f) => f.id)).toEqual([1]);
});
