import { he } from '../../i18n/he';
import type { FirstLookPlacement } from '../../show/mvrLook/placeMvrFirstLook';

/**
 * Plays the MVR first look after an import and tells the operator when it did not land on executor 1, so a look on
 * another executor, or none at all, is never a surprise. Executor 1 needs no toast: it is where the desk starts.
 */
export function applyFirstLook(place: () => FirstLookPlacement, toast: (text: string) => void): void {
  const placement = place();
  if (placement.kind === 'noFreeExecutor') toast(he.mvr.firstLookNoExec);
  if (placement.kind === 'placed' && placement.execIndex > 0) toast(he.mvr.firstLookOn(placement.execIndex + 1));
}
