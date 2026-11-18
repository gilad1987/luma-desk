import { requireChild } from '../dom';

/**
 * Shows `level` (0..1) on a fader: the fill height and the cap position. Executors, the grand master and the MA
 * special faders all paint this way; `--lv` on the parent stays with the caller, because only some of them set it.
 * `fader` may be the `.fader` itself or any element that contains exactly one.
 */
export function paintFader(fader: ParentNode, level: number): void {
  requireChild(fader, '.ff').style.height = level * 100 + '%';
  requireChild(fader, '.cap').style.bottom = level * 100 + '%';
}
