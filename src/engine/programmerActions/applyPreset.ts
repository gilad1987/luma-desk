import type { Programmer } from '../Programmer';
import type { PresetType } from '../presetTypes';
import { presetValues } from '../presetValues';
import { attrEntries } from '../shared';
import { PRESET_TARGETS } from '../stage/presetTargets';
import { colorTargets } from './colorTargets';
import type { ProgrammerDeps } from './ProgrammerDeps';
import { toastSelectFirst } from './toastSelectFirst';

/** The Color pool, the one pool that applies without a selection (see {@link colorTargets}). */
const COLOR_POOL: PresetType = 4;

/**
 * Applies preset `slot` of pool `type` into the programmer, fixture by fixture in selection order, so per-fixture
 * presets (fans, recorded values) spread across the selection. An empty slot does nothing. The original also had an
 * empty `if (type === 2)` branch meant to tidy position phasers; it never did anything and is not carried over.
 * A computed preset that the current stage cannot aim (G10) changes nothing and logs which stage part is missing.
 */
export function applyPreset(p: Programmer, deps: ProgrammerDeps, type: PresetType, slot: number): void {
  const { rig, selection, presets, bus } = deps;
  const pr = presets.all[type][slot];
  if (!pr) return;
  const target = pr.kind === 'fn' ? PRESET_TARGETS[pr.fn] : null;
  if (target !== null && !presets.isAvailable(type, slot)) {
    bus.emit('message', { kind: 'log', text: `Preset ${type}.${slot} needs a ${target} on this stage`, level: 'er' });
    return;
  }
  const ids = type === COLOR_POOL ? colorTargets(deps) : selection.ids;
  if (!ids.length) {
    // colorTargets has already told the operator why
    if (type !== COLOR_POOL) toastSelectFirst(bus);
    return;
  }
  ids.forEach((id, k) => {
    const f = rig.get(id);
    const v = f && presetValues(pr, f, k, ids.length);
    if (!v) return;
    for (const [a, value] of attrEntries(v)) p.set(id, a, value);
  });
  bus.emit('message', { kind: 'log', text: `Preset ${type}.${slot} "${pr.name}"`, level: 'ok' });
}
