import type { Fixture } from '../../domain/Fixture';
import { boundsOf } from '../../domain/stage/bounds';
import type { StageDesign } from '../../domain/stage/StageDesign';
import { surfacesOf } from '../../domain/stage/surfaces';
import { ROOF } from '../../domain/venue';
import { buildDeck } from './DeckBuilder';
import { buildScreens, screenSlotsOf, withWalls, type BuiltScreen } from './ScreenBuilder';
import { StageParts } from './StageParts';
import type { StageFixtureHost, StageSceneDeps } from './StageSceneDeps';
import { materialList, type StageMaterials, type StageSlots } from './StageSlots';
import { buildTrusses } from './TrussBuilder';
import { TrussKit } from './TrussKit';

/**
 * The 3D stage of the current design: deck and risers, trusses, LED walls and the fixture visuals. At boot the venue
 * calls the slots in its creation order and the camera stays put; on `rigChanged` {@link rebuild} frees the old parts
 * and builds the new design. Each build sets the beam surfaces exactly once (contract §9).
 */
export class StageScene implements StageSlots {
  readonly #deps: StageSceneDeps;
  readonly #parts = new StageParts();
  #design: StageDesign;
  #materials: StageMaterials | null = null;
  #kit: TrussKit | null = null;
  #screens: readonly BuiltScreen[] = [];
  #host: StageFixtureHost | null = null;

  constructor(deps: StageSceneDeps, design: StageDesign) {
    this.#deps = deps;
    this.#design = design;
    deps.surfaces.setSurfaces(surfacesOf(design));
  }

  deck(materials: StageMaterials): void {
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
    this.#buildRig(host, fixtures);
  }

  /**
   * Checks the rig first, so a rig the visuals cannot build leaves the old stage whole.
   * @throws Error before boot ({@link connect} not called yet), or when a light type of `fixtures` has no model.
   */
  rebuild(design: StageDesign, fixtures: readonly Fixture[]): void {
    const materials = this.#materials,
      kit = this.#kit,
      host = this.#host;
    if (!materials || !kit || !host) throw new Error('StageScene: rebuild before the boot build');
    host.visuals.assertBuildable(fixtures);
    this.#parts.dispose(new Set([...kit.shared, ...materialList(materials)]));
    this.#design = design;
    this.deck(materials);
    this.trusses(materials);
    this.screens(materials);
    this.#deps.surfaces.setSurfaces(surfacesOf(design));
    this.#buildRig(host, fixtures);
    const { views } = this.#deps;
    views.fitTo(boundsOf(design));
    views.setView(views.currentView);
  }

  /** Hands the fixtures with a built wall to the visuals and the overlay: a screen without a wall gets no label. */
  #buildRig(host: StageFixtureHost, fixtures: readonly Fixture[]): void {
    const slots = screenSlotsOf(this.#screens, host.screenLight),
      shown = withWalls(fixtures, slots);
    host.visuals.rebuild(shown, slots);
    host.overlay.setFixtures(shown);
  }
}
