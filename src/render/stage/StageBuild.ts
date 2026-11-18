import type { Object3D } from 'three';
import type { StageDesign } from '../../domain/stage/StageDesign';
import { ROOF } from '../../domain/venue';
import { buildDeck } from './DeckBuilder';
import { buildScreens, type BuiltScreen } from './ScreenBuilder';
import { StageParts } from './StageParts';
import { materialList, type StageMaterials, type StageSlots } from './StageSlots';
import { buildTrusses } from './TrussBuilder';
import { TrussKit } from './TrussKit';

/**
 * The stage parts of the current design: the deck and risers, the trusses and the LED walls. The venue build calls
 * the three slots in its creation order. The venue owns the materials; this build owns its parts and the truss kit,
 * so it always keeps the same shared set when it frees its parts and frees the kit itself.
 */
export class StageBuild implements StageSlots {
  readonly #scene: Object3D;
  readonly #parts = new StageParts();
  #design: StageDesign;
  #materials: StageMaterials | null = null;
  #kit: TrussKit | null = null;
  #walls: readonly BuiltScreen[] = [];

  constructor(scene: Object3D, design: StageDesign) {
    this.#scene = scene;
    this.#design = design;
  }

  /** The design the slots build; it changes with {@link rebuild} and {@link leaveVenue}. */
  get design(): StageDesign {
    return this.#design;
  }

  /** The LED walls of the last build: the screen fixtures need them. */
  get walls(): readonly BuiltScreen[] {
    return this.#walls;
  }

  /** Whether `o` is a scene child of a stage part, so the venue leaves it to this build. */
  owns(o: Object3D): boolean {
    return this.#parts.owns(o);
  }

  deck(materials: StageMaterials): void {
    this.#materials = materials;
    const { scenery, deck, risers } = this.#design;
    if (scenery.deck) this.#parts.capture(this.#scene, () => buildDeck(this.#scene, deck, risers, materials));
  }

  /** Creates the kit also when the design hides the trusses: a later rebuild that shows them needs it. */
  trusses(materials: StageMaterials): void {
    const kit = (this.#kit ??= new TrussKit(materials.truss));
    const { scenery, trusses, venue } = this.#design;
    const ctx = { parent: this.#scene, kit, dark: materials.dark };
    if (scenery.trusses) this.#parts.capture(this.#scene, () => buildTrusses(ctx, trusses, venue.gridY ?? ROOF));
  }

  screens(materials: StageMaterials): void {
    const scene = this.#scene,
      { scenery, screens, deck } = this.#design,
      walls = scenery.ledWall ? screens : [];
    this.#parts.capture(scene, () => (this.#walls = buildScreens(scene, walls, deck, materials.dark)));
  }

  /**
   * Frees the parts of the current design and builds `next` with the same venue materials and kit: the venue stays.
   * @throws Error before the boot build.
   */
  rebuild(next: StageDesign): void {
    const { materials } = this.#free(next);
    this.deck(materials);
    this.trusses(materials);
    this.screens(materials);
  }

  /**
   * Frees the parts and the kit before a venue switch: the kit holds the old venue's steel, and the old venue frees
   * its own materials. The new venue's slot calls build `next`.
   * @throws Error before the boot build.
   */
  leaveVenue(next: StageDesign): void {
    this.#free(next).kit.dispose();
    this.#kit = null;
    this.#materials = null;
  }

  #free(next: StageDesign): { materials: StageMaterials; kit: TrussKit } {
    const materials = this.#materials,
      kit = this.#kit;
    if (!materials || !kit) throw new Error('StageScene: rebuild before the boot build');
    this.#parts.dispose(new Set([...kit.shared, ...materialList(materials)]));
    this.#design = next;
    return { materials, kit };
  }
}
