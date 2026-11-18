import { clamp } from '../../core';

/** A screen rectangle; a plain object so a clipped target can stand in for a `DOMRect`. */
export interface Box {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly width: number;
  readonly height: number;
}

/** Tip card width in px, matching `#tourTip` in the stylesheet. */
const TIP_WIDTH = 340;

/**
 * The visible part of a target inside a scrolling pane (the pools on MA screen 2). The pane is scrolled first so the
 * target comes into view; the hole then keeps to what the pane shows.
 */
export function visibleTargetBox(target: HTMLElement): Box {
  let r: Box = target.getBoundingClientRect();
  const pane = target.parentElement?.closest<HTMLElement>('.pane');
  if (!pane || pane.scrollHeight <= pane.clientHeight) return r;
  let s: Box = pane.getBoundingClientRect();
  if (r.top < s.top || r.bottom > s.bottom) {
    pane.scrollTop += ((r.top - s.top) * pane.offsetHeight) / s.height - 4;
    r = target.getBoundingClientRect();
    s = pane.getBoundingClientRect();
  }
  const left = Math.max(r.left, s.left),
    top = Math.max(r.top, s.top),
    right = Math.min(r.right, s.right),
    bottom = Math.min(r.bottom, s.bottom);
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

/**
 * Where the tip card goes: under the target, above it when there is no room, else overlapping its top; centred on the
 * target unless the target is wider than 60% of the viewport, and kept 8 px inside the viewport.
 */
export function tipPlacement(r: Box, tipHeight: number, vw: number, vh: number): { left: number; top: number } {
  let top = r.bottom + 14;
  if (top + tipHeight > vh - 8) top = r.top - tipHeight - 14;
  if (top < 8) top = clamp(r.top + 14, 8, vh - tipHeight - 8);
  let left = r.left + r.width / 2 - TIP_WIDTH / 2;
  if (r.width > vw * 0.6) left = r.left + 20;
  return { left: clamp(left, 8, vw - TIP_WIDTH - 8), top };
}
