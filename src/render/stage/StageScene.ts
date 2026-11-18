import type { Fixture } from '../../domain/Fixture';
import { boundsOf } from '../../domain/stage/bounds';
import type { StageDesign } from '../../domain/stage/StageDesign';
import { surfacesOf } from '../../domain/stage/surfaces';
import { ROOF } from '../../domain/venue';
import type { Venue } from '../venue/Venue';
import { buildDeck } from './DeckBuilder';
import { handOverRig } from './handOverRig';
import { buildScreens, type BuiltScreen } from './ScreenBuilder';
import { StageParts } from './StageParts';
import type { StageFixtureHost, StageSceneDeps } from './StageSceneDeps';
import { materialList, type StageMaterials, type StageSlots } from './StageSlots';
import { StageVenue } from './StageVenue';
import { buildTrusses } from './TrussBuilder';
import { TrussKit } from './TrussKit';

/**
 * The 3D stage of the design and the venue around it. At boot the venue calls the slots in its creation order; on
 * `rigChanged` {@link rebuild} frees the old parts and builds the new design. Each build sets the surfaces once (§9).
 */
export class StageScene implements StageSlots {
  readonly #deps: StageSceneDeps;
  readonly #parts = new StageParts();
  readonly #venue: StageVenue;
  #design: StageDesign;
  #materials: StageMaterials | null = null;
  #kit: TrussKit | null = null;
  #screens: readonly BuiltScreen[] = [];
  #host: StageFixtureHost | null = null;

  constructor(deps: StageSceneDeps, design: StageDesign) {
    this.#deps = deps;
    this.#design = design;
    this.#venue = new StageVenue(deps, this, (o) => this.#parts.owns(o));
    deps.surfaces.setSurfaces(surfacesOf(design), design.venue.kind);
  }

  /** Builds the venue of the boot design; the returned venue stays current across later venue switches. */
  buildVenue(): Venue {
    this.#venue.build(this.#design.venue.kind);
    this.#venue.apply(this.#design);
    return this.#venue;
  }

  /** A new venue brings new materials, so the truss kit made with the old steel is built again. */
  deck(materials: StageMaterials): void {
    if (materials !== this.#materials) this.#kit = null;
    this.#materials = materials;
    const { scenery, deck, risers } = this.#design;
    if (scenery.deck) this.#parts.capture(this.#deps.scene, () => buildDeck(this.#deps.scene, deck, risers, materials));
  }

  trusses(materials: StageMaterials): void {
    const ctx = { parent: this.#deps.scene, kit: (this.#kit ??= new TrussKit(materials.truss)), dark: materials.dark };
    const { trusses, venue } = this.#design;
    this.#parts.capture(ctx.parent, () => buildTrusses(ctx, trusses, venue.gridY ?? ROOF));
  }

  screens(materials: StageMaterials): void {
    const { scene } = this.#deps,
      { scenery, screens, deck } = this.#design,
      walls = scenery.ledWall ? screens : [];
    this.#parts.capture(scene, () => (this.#screens = buildScreens(scene, walls, deck, materials.dark)));
  }

  /** Builds the boot rig's fixture visuals into the walls built so far; later rigs come with {@link rebuild}. */
  connect(host: StageFixtureHost, fixtures: readonly Fixture[]): void {
    this.#host = host;
    handOverRig(host, this.#screens, fixtures);
  }

  /**
   * Checks the rig first, so a rig the visuals cannot build leaves the old stage whole. Only a new venue kind rebuilds
   * the venue, and it frees the old venue's materials and truss kit too. @throws Error before boot, or on a rig with
   * a light type that has no model.
   */
  rebuild(design: StageDesign, fixtures: readonly Fixture[]): void {
    const materials = this.#materials,
      kit = this.#kit,
      host = this.#host;
    if (!materials || !kit || !host) throw new Error('StageScene: rebuild before the boot build');
    host.visuals.assertBuildable(fixtures);
    const isSameVenue = design.venue.kind === this.#design.venue.kind;
    this.#parts.dispose(new Set(isSameVenue ? [...kit.shared, ...materialList(materials)] : []));
    this.#design = design;
    if (isSameVenue) this.#buildStage(materials);
    else this.#venue.switchTo(design.venue.kind);
    this.#venue.apply(design);
    this.#deps.surfaces.setSurfaces(surfacesOf(design), design.venue.kind);
    handOverRig(host, this.#screens, fixtures);
    this.#deps.views.fitTo(boundsOf(design));
    this.#deps.views.setView(this.#deps.views.currentView);
  }

  #buildStage(materials: StageMaterials): void {
    this.deck(materials);
    this.trusses(materials);
    this.screens(materials);
  }
}
