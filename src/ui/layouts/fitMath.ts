import { clamp } from '../../core';
import type { StoredSetting } from './StoredSetting';

/** The MA console's default share of the window height under the top bar; the grip can override it. */
export const MA_SIZE = 0.47;

/**
 * The zoom of a console for a `#deskZoom` value: a fixed factor, or with `auto` the window width over the console's
 * design width, clamped so the legends stay readable.
 */
export function zoomFactor(zoom: StoredSetting, innerWidth: number, designWidth: number, min: number): number {
  return zoom === 'auto' ? clamp((innerWidth - 24) / designWidth, min, 1.05) : Number(zoom);
}

/** The projected MA console at zoom 1: its size and how far its planes reach past `#maBody` above and below. */
export interface MaGeometry {
  readonly W: number;
  readonly H: number;
  readonly mt: number;
  readonly mb: number;
}

/**
 * The MA console zoom: fit by projected width and by a share of the height under the top bar. Without a grip size the
 * share is `MA_SIZE`, raised (up to .66) in small windows until the zoom reaches .6.
 */
export function maZoom(geo: MaGeometry, maSize: number | undefined, innerWidth: number, innerHeight: number): number {
  const hz = (innerHeight - 40) / geo.H,
    share = maSize ?? clamp(0.6 / hz, MA_SIZE, 0.66);
  return clamp(Math.min(1.1, (innerWidth * 0.98) / geo.W, share * hz), 0.2, 1.5);
}

/** The console's height share for a grip at `clientY`: the space below it over the space under the top bar. */
export function gripShare(clientY: number, innerHeight: number): number {
  return clamp((innerHeight - clientY) / (innerHeight - 40), 0.3, 0.7);
}
