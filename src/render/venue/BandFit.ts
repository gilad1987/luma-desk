import type { Object3D } from 'three';
import { isIdentityFit, onDeck, type DeckFit } from '../../domain/stage/deckFit';
import { placePaHang } from './PaFit';
import type { PaHang } from './PaHangs';
import type { Performer } from './performerSpec';

/**
 * Where a band object stood as built for the built-in deck: position, the riser stretch in x and z, and whether it
 * stands on the ground (the PA subs) instead of on the deck.
 */
interface Placement {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly scaleX: number;
  readonly scaleZ: number;
  readonly onGround: boolean;
}

const placementOf = (o: Object3D, onGround: boolean): Placement => ({
  x: o.position.x,
  y: o.position.y,
  z: o.position.z,
  scaleX: o.scale.x,
  scaleZ: o.scale.z,
  onGround,
});

/**
 * Moves `o` from its built-in placement onto the fitted deck; a riser also stretches with the deck. A ground object
 * keeps its built y: the ground does not move with the deck, so a lower deck must not sink it into the floor, nor a
 * higher one lift it into the air.
 */
function place(o: Object3D, built: Placement, fit: DeckFit): void {
  const [x, z] = onDeck(fit, built.x, built.z);
  o.position.set(x, built.onGround ? built.y : built.y + fit.lift, z);
  if (o.userData['riser']) o.scale.set(built.scaleX * fit.scaleX, o.scale.y, built.scaleZ * fit.scaleZ);
}

/**
 * Moves the band, the orchestra and the PA subs with the deck (plan §3.3, `fitToDeck`): x scales with the deck width,
 * z with its depth from the downstage edge, and all but the ground objects lift by the deck height change. The PA
 * hangs do not ride the deck: they follow `placePaHang`, under the trusses or standing on the deck. Each fit starts
 * from the built placement, so fits never stack when the deck changes again.
 */
export class BandFit {
  readonly #objects: readonly Object3D[];
  readonly #performers: readonly Performer[];
  readonly #hangs: readonly PaHang[];
  readonly #ground: readonly Object3D[];
  /** The built placements, read at the first fit that moves something; null while the band never moved. */
  #built: Map<Object3D, Placement> | null = null;

  /**
   * `objects` are the band objects on the deck; `performers` are the members the beat moves; `hangs` are the PA
   * hangs, which follow the trusses as well as the deck (`placePaHang`); `ground` are the objects that stand on the
   * ground (the PA subs), which move in plan with the deck but keep their built height.
   */
  constructor(
    objects: readonly Object3D[],
    performers: readonly Performer[],
    hangs: readonly PaHang[] = [],
    ground: readonly Object3D[] = [],
  ) {
    this.#objects = objects;
    this.#performers = performers;
    this.#hangs = hangs;
    this.#ground = ground;
  }

  /**
   * Places the band on the deck of `fit`, the PA hangs under `trussUnderside` (the underside of the highest truss,
   * null for none), and returns the performers with their rest height lifted, which the beat animation reads. The
   * identity fit of a band that never moved returns at once after the hangs: the boot stage does no extra math on it.
   */
  fit(fit: DeckFit, trussUnderside: number | null): readonly Performer[] {
    for (const hang of this.#hangs) placePaHang(hang, fit, trussUnderside);
    if (!this.#built && isIdentityFit(fit)) return this.#performers;
    const built = (this.#built ??= new Map([
      ...this.#ground.map((o): [Object3D, Placement] => [o, placementOf(o, true)]),
      ...this.#objects.map((o): [Object3D, Placement] => [o, placementOf(o, false)]),
    ]));
    for (const [o, placement] of built) place(o, placement, fit);
    return this.#performers.map((p) => ({ ...p, baseY: p.baseY + fit.lift }));
  }
}
