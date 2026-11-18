import type { Material } from 'three';

/** The venue materials the stage parts are drawn with; the venue owns them, so a stage rebuild never frees them. */
export interface StageMaterials {
  readonly deck: Material;
  readonly black: Material;
  readonly dark: Material;
  readonly truss: Material;
}

/** The venue materials as a list: a stage rebuild passes them to `StageParts.dispose` as shared. */
export const materialList = (m: StageMaterials): Material[] => [m.deck, m.black, m.dark, m.truss];

/**
 * The points in a venue build where the stage parts go. Each venue kind calls the three slots once, in its own
 * creation order: three.js draws each uuid from the seeded Math.random, so the Sultan's Pool venue calls them where
 * the legacy scene built the deck, the rig steel and the LED wall (decision 24).
 */
export interface StageSlots {
  /** The deck, its skirt and nosing, then the risers. */
  deck(materials: StageMaterials): void;
  /** Every truss of the design in array order, with its chains. */
  trusses(materials: StageMaterials): void;
  /** The LED walls with their side screens, frames and the deck-edge strip. */
  screens(materials: StageMaterials): void;
}
