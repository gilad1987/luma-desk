import type { RigBuilder } from './RigBuilder';

/**
 * The washes on the side ladders (601-624): left side then right, upstage-most ladder last, bottom to top. Ids count
 * through the nested loops, so this loop order is the id order.
 */
export function addLadderWashes(rig: RigBuilder): void {
  let id = 601;
  for (const sx of [-1, 1])
    for (const z of [-3, -9, -15])
      for (const y of [5, 9.5, 14, 18.5]) rig.add({ id: id++, type: 'wash', at: [sx * 23.6, y, z], mount: 'hang' });
}
