import type { AttrName } from '../../domain/attributes';
import type { Fixture } from '../../domain/Fixture';

/** A fixture's output for one frame: every attribute has a value once the frame's merge has reset it. */
export type AttrOutput = Record<AttrName, number>;

const WHITE = [100, 100, 100] as const;

/**
 * Resets `f.out` in place to the fixture's resting look (dark, rigged position, its gel or default colour, open beam)
 * and returns it typed as complete. The object is reused, not replaced, because the renderer and the UI hold it; the
 * values go straight into it because this runs for every fixture in every frame.
 */
export function resetOutput(f: Fixture): AttrOutput {
  const T = f.T,
    o = f.out,
    color = f.gel ?? T.defColor ?? WHITE;
  o.dim = 0;
  o.pan = f.fixed ? f.fixed.pan : 0;
  o.tilt = f.fixed ? f.fixed.tilt : 0;
  // b, g, r: the first frame creates the keys in this order, as the original chained assignment did
  o.b = color[2];
  o.g = color[1];
  o.r = color[0];
  o.zoom = T.z0;
  o.gobo = f.type === 'screen' ? 1 : 0;
  o.grot = 0;
  o.strobe = 0;
  // every AttrName was just written, so the output is complete; resetOutput.test.ts guards the list against new names
  return o as AttrOutput;
}
