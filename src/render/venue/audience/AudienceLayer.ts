import { Group, Vector3, type Camera, type InstancedMesh, type Material } from 'three';
import { audiencePass, type AudienceUniforms } from './audienceShader';
import type { Detail } from './figureGeometry';
import { AUDIENCE_GROUP, figureSlot, type Slot } from './figureSlot';
import { FIGURES } from './FigureSpec';
import { DEFAULT_AUDIENCE, figureCount } from './occupancy';
import { seatPeople, type People } from './people';
import { fillSlots, setLevels, UNSORTED } from './audienceSort';

/** The camera must move this far before the figures are sorted into the two levels again, metres. */
const MOVE = 1;

/**
 * The audience on the seats of one layer: per body of the library one instanced mesh for the near level and one for
 * the far level. The people are sorted into the two by their distance to the camera, at a low rate. The sort runs in
 * `updateMatrixWorld`, which the renderer calls before it uploads instance buffers: buffers and counts so change in
 * the same frame. The camera is the last one that drew a mesh and has no `userData.passCamera` (see `see`).
 */
export class AudienceLayer extends Group {
  readonly #people: People;
  readonly #slots: Slot[] = [];
  readonly #uniforms: AudienceUniforms;
  readonly #eye = new Vector3(Infinity, Infinity, Infinity);
  readonly #sortedAt = new Vector3();
  /** The level of detail of each seated person in fill order, as the meshes hold it now. */
  readonly #levels: Uint8Array;
  #occupancy = DEFAULT_AUDIENCE.occupancy;
  #stale = true;

  constructor(seats: InstancedMesh, material: Material, uniforms: AudienceUniforms, gone: () => void) {
    super();
    this.name = AUDIENCE_GROUP;
    this.#people = seatPeople(seats, FIGURES.length);
    this.#levels = new Uint8Array(this.#people.order.length).fill(UNSORTED);
    this.#uniforms = uniforms;
    const pass = (override: Material): Material => audiencePass(override, uniforms);
    let freed = false;
    // every mesh reports its disposal; the shared material and the layer are freed with the first one
    const free = (): void => {
      if (freed) return;
      freed = true;
      material.dispose();
      gone();
    };
    const hooks = { material, gone: free, pass };
    const see = (camera: Camera): void => this.see(camera);
    FIGURES.forEach((spec, variant) => {
      const capacity = Math.max(1, this.#people.variant.filter((v) => v === variant).length);
      for (const detail of ['near', 'far'] satisfies Detail[]) {
        // one mesh notes the camera for the layer: every mesh is drawn each frame, also with no person in it
        const slot = figureSlot(spec, detail, capacity, this.#slots.length === 0 ? { ...hooks, see } : hooks);
        this.#slots.push(slot);
        this.add(slot.mesh);
      }
    });
    this.#sort();
  }

  /** The number of figures on this layer at the occupancy now set. */
  get figures(): number {
    return figureCount(this.#people.order.length, this.#occupancy);
  }

  /**
   * Notes the camera that draws the audience, for the next sort, and steps the idle clock. A camera that draws for a
   * pass (`userData.passCamera`: the lamp of a shadow map) is no eye: a sort for the lamp, then one for the viewer,
   * moved people between the levels in each frame, and each move outdated the shadow maps (`SceneWatch`).
   */
  see(camera: Camera): void {
    if (camera.userData['passCamera'] !== true) this.worldToLocal(this.#eye.setFromMatrixPosition(camera.matrixWorld));
    // `?test` freezes `performance.now`, so the sway is the same in every test frame.
    this.#uniforms.uTime.value = performance.now() / 1000;
  }

  setOccupancy(occupancy: number): void {
    this.#occupancy = occupancy;
    this.#stale = true;
  }

  override updateMatrixWorld(force?: boolean): void {
    super.updateMatrixWorld(force);
    if (this.#stale || this.#eye.distanceTo(this.#sortedAt) > MOVE) this.#sort();
  }

  /**
   * Sorts the seated people into the two levels for the eye now. The buffers are copied and uploaded again only when
   * a person changed level or the occupancy changed: an orbiting camera moves `MOVE` nearly every frame, and a full
   * copy of every layer each time was 24 buffer uploads a frame for a picture that did not change.
   */
  #sort(): void {
    const changed = setLevels(this.#people, this.figures, this.#sortedAt.copy(this.#eye), this.#levels);
    if (changed || this.#stale) fillSlots(this.#people, this.figures, this.#levels, this.#slots);
    this.#stale = false;
  }
}
