import type { Fixture } from '../../domain/Fixture';
import { boundsOf } from '../../domain/stage/bounds';
import type { StageDesign } from '../../domain/stage/StageDesign';
import { surfacesOf } from '../../domain/stage/surfaces';
import type { Venue } from '../venue/Venue';
import { handOverRig } from './handOverRig';
import { StageBuild } from './StageBuild';
import type { StageFixtureHost, StageSceneDeps } from './StageSceneDeps';
import { StageVenue } from './StageVenue';

/**
 * The 3D stage of the current design and the venue around it: deck and risers, trusses, LED walls and the fixture
 * visuals. At boot the venue calls the slots in its creation order and the camera stays put; on `rigChanged`
 * {@link rebuild} frees the old parts and builds the new design. Each build sets the beam surfaces exactly once
 * (contract §9).
 */
export class StageScene {
  readonly #deps: StageSceneDeps;
  readonly #build: StageBuild;
  readonly #venue: StageVenue;
  #host: StageFixtureHost | null = null;

  constructor(deps: StageSceneDeps, design: StageDesign) {
    this.#deps = deps;
    this.#build = new StageBuild(deps.scene, design);
    this.#venue = new StageVenue(deps, this.#build, (o) => this.#build.owns(o));
    deps.surfaces.setVenue(design.venue.kind);
    deps.surfaces.setSurfaces(surfacesOf(design));
  }

  /** Builds the venue of the boot design; the returned venue stays current across later venue switches. */
  buildVenue(): Venue {
    const design = this.#build.design;
    this.#venue.build(design.venue.kind);
    this.#venue.apply(design);
    return this.#venue;
  }

  /** Builds the boot rig's fixture visuals into the walls built so far; later rigs come with {@link rebuild}. */
  connect(host: StageFixtureHost, fixtures: readonly Fixture[]): void {
    this.#host = host;
    handOverRig(host, this.#build.walls, fixtures);
  }

  /**
   * Checks the rig first, so a rig the visuals cannot build leaves the old stage whole. Only a new venue kind rebuilds
   * the venue; then the stage frees its truss kit and the old venue frees its own materials.
   * @throws Error before boot ({@link connect} not called yet), or when a light type of `fixtures` has no model.
   */
  rebuild(design: StageDesign, fixtures: readonly Fixture[]): void {
    const host = this.#host;
    if (!host) throw new Error('StageScene: rebuild before the boot build');
    host.visuals.assertBuildable(fixtures);
    const { kind } = design.venue;
    if (kind === this.#build.design.venue.kind) this.#build.rebuild(design);
    else {
      this.#build.leaveVenue(design);
      this.#venue.switchTo(kind);
      this.#deps.surfaces.setVenue(kind);
    }
    this.#venue.apply(design);
    this.#deps.surfaces.setSurfaces(surfacesOf(design));
    handOverRig(host, this.#build.walls, fixtures);
    const { views } = this.#deps;
    views.fitTo(boundsOf(design));
    views.setView(views.currentView);
  }
}
