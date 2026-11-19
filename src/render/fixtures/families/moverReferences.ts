import type { MoverBody } from '../../../domain/fixtureProducts/FixtureProduct';
import type { ProfilePoint } from '../ModelPrimitives';
import { FORTE_BARREL_PROFILE, FORTE_BEZEL_PROFILE } from '../models/forteHead';
import { MEGAPOINTE_BARREL_PROFILE, MEGAPOINTE_RING_PROFILE, MEGAPOINTE_WALL_PROFILE } from '../models/megapointeHead';
import { SPIIDER_BEZEL_PROFILE, SPIIDER_DRUM_PROFILE, SPIIDER_SEGMENTS } from '../models/spiiderHead';

/** One native Robe head the `mover` family scales: its own lathe point lists and the numbers they scale by. */
export interface MoverReference {
  /** The barrel lathe, front to rear. */
  readonly barrel: readonly ProfilePoint[];
  /** The bezel lathe round the lens; its first point is the inner lip, which the family puts at the lens radius. */
  readonly bezel: readonly ProfilePoint[];
  /** Lathes drawn at the lens radius all along (the MegaPointe ring's inner wall), listed rear to front. */
  readonly walls: readonly (readonly ProfilePoint[])[];
  /** Lathe segments of the barrel, bezel and walls. */
  readonly segments: number;
  /** Barrel radius and y of the rear cap and of the lens face, which the product's `barrel` numbers replace. */
  readonly shape: MoverBody['barrel'];
  /** Rib or groove ring: radius over the barrel, and height. */
  readonly rib: { readonly outset: number; readonly height: number };
}

/** The default lathe segments of `ModelPrimitives.lathe`, which the FORTE and MegaPointe heads draw with. */
const LATHE_SEGMENTS = 28;

/** The reference head of each `MoverBody['ref']`, read from the native head files, so the two never drift apart. */
export const MOVER_REFERENCES = {
  forte: {
    barrel: FORTE_BARREL_PROFILE,
    bezel: FORTE_BEZEL_PROFILE,
    walls: [],
    segments: LATHE_SEGMENTS,
    shape: { r: 0.335, rear: 0.45, front: -0.78 },
    rib: { outset: 0.01, height: 0.014 },
  },
  // the MegaPointe has no ribs; a product that asks for them gets the FORTE's
  megapointe: {
    barrel: MEGAPOINTE_BARREL_PROFILE,
    bezel: MEGAPOINTE_RING_PROFILE,
    walls: [MEGAPOINTE_WALL_PROFILE],
    segments: LATHE_SEGMENTS,
    shape: { r: 0.41, rear: 0.38, front: -0.53 },
    rib: { outset: 0.01, height: 0.014 },
  },
  spiider: {
    barrel: SPIIDER_DRUM_PROFILE,
    bezel: SPIIDER_BEZEL_PROFILE,
    walls: [],
    segments: SPIIDER_SEGMENTS,
    shape: { r: 0.525, rear: 0.19, front: -0.305 },
    rib: { outset: 0.005, height: 0.012 },
  },
} as const satisfies Record<MoverBody['ref'], MoverReference>;

/**
 * The MegaPointe side grille (`models/megapointeHead.ts`) as a fraction of its barrel: y over the rear span, width and
 * height over the radius. Every `vents: true` body gets it, whatever its `ref`.
 */
export const MOVER_VENT = {
  y: 0.06 / 0.38,
  width: 0.3 / 0.41,
  height: 0.26 / 0.41,
  depth: 0.02,
  inset: 0.005,
} as const;
