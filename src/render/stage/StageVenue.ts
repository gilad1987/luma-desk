import type { Mesh, Object3D, PointLight } from 'three';
import { deckFitOf } from '../../domain/stage/deckFit';
import type { StageDesign } from '../../domain/stage/StageDesign';
import { SCENERY_PARTS, type VenueKind } from '../../domain/stage/types';
import type { FohRig } from '../camera/FohRig';
import type { CrowdBounceUniforms } from '../venue/crowdBounce';
import type { Performer } from '../venue/performerSpec';
import type { Sky } from '../venue/Sky';
import { buildVenue, type BuiltVenue, type Venue } from '../venue/Venue';
import type { SceneryRegistry } from './SceneryRegistry';
import { StageParts } from './StageParts';
import type { StageSceneDeps } from './StageSceneDeps';
import { materialList, type StageSlots } from './StageSlots';

/**
 * The venue around the stage, live: the frame loop and the lights hold this one object and it reads the venue built
 * last, so a venue switch reaches them without new wiring. It owns the venue's scene objects except the stage parts,
 * and keeps the camera views' FOH rig on the current FOH riser.
 */
export class StageVenue implements Venue {
  readonly #scene: Object3D;
  readonly #fohRig: Pick<FohRig, 'add' | 'remove'>;
  readonly #stage: StageSlots;
  readonly #isStagePart: (o: Object3D) => boolean;
  readonly #parts = new StageParts();
  #built: BuiltVenue | null = null;
  #performers: readonly Performer[] = [];

  /** `stage` takes the slot calls of each build; `isStagePart` tells the stage's own scene objects apart. */
  constructor(deps: Pick<StageSceneDeps, 'scene' | 'views'>, stage: StageSlots, isStagePart: (o: Object3D) => boolean) {
    this.#scene = deps.scene;
    this.#fohRig = deps.views.fohRig;
    this.#stage = stage;
    this.#isStagePart = isStagePart;
  }

  /**
   * Builds the venue of `kind`, which calls the stage slots, and puts its FOH riser in the camera views' rig. Its
   * materials are freed with it, also those that only the stage parts draw with.
   */
  build(kind: VenueKind): void {
    const scene = this.#scene;
    this.#parts.capture(scene, () => (this.#built = buildVenue(scene, this.#stage, kind)), this.#isStagePart);
    const built = this.#current();
    this.#parts.track(...materialList(built.materials));
    this.#fohRig.add(...built.fohRig);
  }

  /** Frees the current venue and builds the venue of `kind`; free the stage parts first, as they use its materials. */
  switchTo(kind: VenueKind): void {
    this.dispose();
    this.build(kind);
  }

  /** Shows or hides the scenery parts of `design` and moves the band onto its deck, without a rebuild. */
  apply(design: Pick<StageDesign, 'scenery' | 'deck'>): void {
    const built = this.#current();
    for (const part of SCENERY_PARTS) built.scenery.setVisible(part, design.scenery[part]);
    this.#performers = built.band.fit(deckFitOf(design.deck));
  }

  /** Takes the venue out of the scene and frees all it owns. */
  dispose(): void {
    this.#fohRig.remove(...this.#current().fohRig);
    this.#parts.dispose(new Set());
    this.#built = null;
  }

  get sky(): Sky | null {
    return this.#current().sky;
  }
  get fohRig(): readonly Mesh[] {
    return this.#current().fohRig;
  }
  get wallFloodlight(): PointLight | null {
    return this.#current().wallFloodlight;
  }
  get performers(): readonly Performer[] {
    return this.#performers;
  }
  get crowd(): CrowdBounceUniforms {
    return this.#current().crowd;
  }
  get scenery(): SceneryRegistry {
    return this.#current().scenery;
  }

  /** @throws Error before the first build: nothing may read a venue that does not exist yet. */
  #current(): BuiltVenue {
    if (!this.#built) throw new Error('StageVenue: no venue built');
    return this.#built;
  }
}
