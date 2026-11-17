import type { Fixture } from '../../domain/Fixture';
import type { Programmer } from '../Programmer';
import { compactFx, PHASER_TYPES, stripFx, type PhaserFeature, type PhaserType } from '../shared';
import type { ProgrammerDeps } from './ProgrammerDeps';
import { toastSelectFirst } from './toastSelectFirst';

/** Whether `f` can run a phaser on `feat`: position needs a moving head, colour needs RGB, dimmer a dimmer. */
function canRun(f: Fixture, feat: PhaserFeature): boolean {
  return feat === 'pos' ? f.T.moving : feat === 'color' ? f.has('r') : f.has('dim');
}

/**
 * Starts a phaser of `type` on the selected fixtures that can run it, in selection order (the order sets the phase
 * spread). The selection first leaves any phaser on the same feature, so a fixture runs one phaser per feature.
 */
export function applyPhaser(p: Programmer, { rig, selection, bus }: ProgrammerDeps, type: PhaserType): void {
  const sel = selection.ids;
  if (!sel.length) {
    toastSelectFirst(bus);
    return;
  }
  const def = PHASER_TYPES[type];
  stripFx(p.fxList, sel, def.feat);
  const ids = sel.filter((id) => {
    const f = rig.get(id);
    return f !== undefined && canRun(f, def.feat);
  });
  if (!ids.length) {
    // the strip above stays: emptied phasers remain in fxList and in fx until the next edit, as they always did
    bus.emit('message', { kind: 'toast', text: 'Selected fixtures do not support this phaser' });
    return;
  }
  p.fxList = compactFx(p.fxList);
  p.fxList.push({ type, rate: 1, size: def.size, spread: 360, ids });
  p.reindexFx();
  bus.emit('message', { kind: 'log', text: `Phaser ${def.name} → ${ids.length} fixtures`, level: 'ok' });
}
