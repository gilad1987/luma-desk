import type { AttrName } from '../../domain/attributes';
import type { Fixture } from '../../domain/Fixture';

/** A fixture's output for one frame: every attribute has a value once the frame's merge has reset it. */
export type AttrOutput = Record<AttrName, number>;

const WHITE = [100, 100, 100] as const;

/**
 * Resets `f.out` in place to the fixture's resting look (dark, rigged position, its default colour, open beam) and
 * returns it typed as complete. The object is reused, not replaced, because the renderer and the UI hold it.
 */
export function resetOutput(f: Fixture): AttrOutput {
  const T = f.T;
  const [r, g, b] = T.defColor ?? WHITE;
  // b, g, r: the first frame creates the keys in this order, as the original chained assignment did
  return Object.assign(f.out, {
    dim: 0,
    pan: f.fixed ? f.fixed.pan : 0,
    tilt: f.fixed ? f.fixed.tilt : 0,
    b,
    g,
    r,
    zoom: T.z0,
    gobo: f.type === 'screen' ? 1 : 0,
    grot: 0,
    strobe: 0,
  });
}
