import type { Rig } from '../../../../../src/domain/rig';
import { defaultGroupsOracle, type Groups } from './groupsOracle';

// Reference oracles: the original NEW_GROUPS 1958, the group part of loadShow 2301-2303 and storeGroup 1865-1869
// from index.html at 48a3b63, formatted by Prettier. Changes: types (and a narrowing local in loadShow); the globals
// (groups, sel, log) are parameters; renderPools/persist record the events that replace them.

const NEW_GROUPS = ['LED Bars', 'Follow Spots', 'Profiles'];

/** The group part of loadShow: `d.groups` mutated in place, then used as the pool. */
export function loadGroupsOracle(d: { groups?: Groups }, rig: Rig): Groups {
  const groups = d.groups || defaultGroupsOracle(rig);
  if (d.groups) {
    const dg = defaultGroupsOracle(rig);
    for (const n in dg) {
      const dgn = dg[n];
      if (dgn && NEW_GROUPS.includes(dgn.name) && !groups[n]) groups[n] = dgn;
    }
  }
  return groups;
}

export function storeGroupOracle(groups: Groups, sel: number[], slot: number, calls: string[]): void {
  const log = (text: string, level = '') => calls.push(`log:${level}:${text}`);
  const renderPools = () => calls.push('poolsChanged');
  const persist = () => calls.push('showChanged');
  if (!sel.length) {
    log('Store Group: nothing selected', 'er');
    return;
  }
  groups[slot] = { name: groups[slot]?.name || `Group ${slot}`, ids: [...sel] };
  log(`Stored Group ${slot}`, 'ok');
  renderPools();
  persist();
}
