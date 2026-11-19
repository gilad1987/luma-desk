/**
 * The parametric body of a static dish light hung in an arch yoke (the Robe PATT family): a deep bezel ring with a
 * front grille on 3 spokes, a reflector bowl, a rear connector cylinder, and a twin-tube arch over the top that pivots
 * on a T-knob at each side and hangs from its top. All lengths are model units scaled by `size`, with the tilt pivot at
 * the origin and the lens towards -y, so one family builder draws every row from these numbers.
 */
export interface YokedCanBody {
  readonly family: 'yokedCan';
  /** Metres per model unit (`FixtureType.size`). */
  readonly size: number;
  /** Bezel ring: outer radius, y of its front face, y of its back edge (where the bowl starts). */
  readonly rim: { readonly r: number; readonly front: number; readonly back: number };
  /** Bowl radius at its back, and the y there; the bowl curves in from the bezel like a parabolic dish. */
  readonly bowl: { readonly r: number; readonly y: number };
  /** Rear connector cylinder behind the bowl: its radius and the y of its back cap. */
  readonly rear: { readonly r: number; readonly y: number };
  /** Reflector radius at the mouth, behind the grille. */
  readonly mouth: number;
  /** Painted reflector face: radius, y (recessed behind the mouth), and `BuiltModel.lensOff`. */
  readonly lens: { readonly r: number; readonly y: number; readonly off: number };
  /** What glows in the reflector centre: an LED half-ball diffuser dome or a bare tungsten lamp. */
  readonly centre: 'dome' | 'lamp';
  /** Grille mesh cells across the mouth: a coarse diamond mesh or a fine wire grille. */
  readonly grille: number;
  /** Arch centre line: tube radius, half-width at the pivots, top height over the pivot; half gap of the twin tubes. */
  readonly arch: { readonly tube: number; readonly halfWidth: number; readonly height: number; readonly gap: number };
  /** x of the outer end of each side T-knob. */
  readonly knob: number;
}
