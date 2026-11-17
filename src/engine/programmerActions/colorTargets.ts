import type { ProgrammerDeps } from './ProgrammerDeps';

type ColorDeps = Pick<ProgrammerDeps, 'rig' | 'selection' | 'bus'>;

/**
 * The fixtures a colour action applies to: the selected fixtures that have colour, or, with no selection, every
 * colour fixture that is lit now (dimmer above 1). Colour is the one action that works without a selection, so the
 * operator can recolour a running look at once; every outcome is toasted so the choice is never silent.
 */
export function colorTargets({ rig, selection, bus }: ColorDeps): number[] {
  const toast = (text: string): void => bus.emit('message', { kind: 'toast', text });
  if (selection.ids.length) {
    const ok = selection.ids.filter((id) => rig.get(id)?.has('r'));
    if (!ok.length) toast('לגופים שנבחרו אין שליטת צבע');
    return ok;
  }
  // `out` is empty until the first output merge, so before it no fixture counts as lit
  const lit = rig.fixtures.filter((f) => f.has('r') && (f.out.dim ?? 0) > 1).map((f) => f.id);
  if (!lit.length) {
    toast('בחר קודם גופים (Group / לחיצה על הבמה) — אין כרגע גופים דולקים');
    return [];
  }
  toast(`אין בחירה — הצבע הוחל על כל ${lit.length} הגופים הדולקים`);
  return lit;
}
