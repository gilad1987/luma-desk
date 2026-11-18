import type { Programmer } from '../Programmer';
import type { ProgrammerDeps } from './ProgrammerDeps';

/**
 * Drops the values and the phaser members of the fixtures the current rig lacks, on `rigChanged`. Without it the
 * programmer keeps values for ids no fixture has: the chip counts them and Store Cue records them. It emits
 * `stateDirty`, as CLEAR does, only when it dropped something, so a stage change that keeps every programmed fixture
 * repaints nothing. `rig` is read here, at event time, so it is the new rig. A builder `preview` is not committed:
 * the programmer keeps its values, which have no output on fixtures the preview rig lacks, and Cancel gives them back.
 */
export function pruneToRig(p: Programmer, { rig, bus, source }: ProgrammerDeps): void {
  if (source?.cause === 'preview') return;
  const absent = (id: number): boolean => rig.get(id) === undefined;
  const goneVals = Object.keys(p.vals).map(Number).filter(absent);
  const goneFx = [...new Set(p.fxList.flatMap((inst) => inst.ids))].filter(absent);
  for (const id of goneVals) delete p.vals[id];
  if (goneFx.length) p.removePhasers(goneFx);
  if (goneVals.length || goneFx.length) bus.emit('stateDirty', undefined);
}
