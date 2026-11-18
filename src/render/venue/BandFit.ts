import type { Object3D } from 'three';
import { isIdentityFit, onDeck, type DeckFit } from '../../domain/stage/deckFit';
import { placePaHang } from './PaFit';
import type { PaHang } from './PaHangs';
import type { Performer } from './performerSpec';

/** Where a band object stood as built for the built-in deck: position, and the riser stretch in x and z. */
interface Placement {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly scaleX: number;
  readonly scaleZ: number;
}

const placementOf = (o: Object3D): Placement => ({
  x: o.position.x,
  y: o.position.y,
  z: o.position.z,
  scaleX: o.scale.x,
  scaleZ: o.scale.z,
});

/** Moves `o` from its built-in placement onto the fitted deck; a riser also stretches with the deck. */
function place(o: Object3D, built: Placement, fit: DeckFit): void {
  const [x, z] = onDeck(fit, built.x, built.z);
  o.position.set(x, built.y + fit.lift, z);
  if (o.userData['riser']) o.scale.set(built.scaleX * fit.scaleX, o.scale.y, built.scaleZ * fit.scaleZ);
}

/**
 * Moves the band, the orchestra and the PA with the deck (plan §3.3, `fitToDeck`): x scales with the deck width, z
 * with its depth from the downstage edge, and everything lifts by the deck height change. Each fit starts from the
 * built placement, so fits never stack when the deck changes again.
 */
export class BandFit {
  readonly #objects: readonly Object3D[];
  readonly #performers: readonly Performer[];
  readonly #hangs: readonly PaHang[];
  /** The built placements, read at the first fit that moves something; null while the band never moved. */
  #built: Map<Object3D, Placement> | null = null;

  /**
   * `objects` are the scene children the band builders added, without the PA hangs; `performers` are the members the
   * beat moves; `hangs` are the PA hangs, which follow the trusses as well as the deck (`placePaHang`).
   */
  constructor(objects: readonly Object3D[], performers: readonly Performer[], hangs: readonly PaHang[] = []) {
    this.#objects = objects;
    this.#performers = performers;
    this.#hangs = hangs;
  }

  /**
   * Places the band on the deck of `fit`, the PA hangs under `trussTop` (the highest truss y, null for none), and
   * returns the performers with their rest height lifted, which the beat animation reads. The identity fit of a band
   * that never moved returns at once after the hangs: the boot stage does no extra math on the band.
   */
  fit(fit: DeckFit, trussTop: number | null): readonly Performer[] {
    for (const hang of this.#hangs) placePaHang(hang, fit, trussTop);
    if (!this.#built && isIdentityFit(fit)) return this.#performers;
    const built = (this.#built ??= new Map(this.#objects.map((o) => [o, placementOf(o)])));
    for (const [o, placement] of built) place(o, placement, fit);
    return this.#performers.map((p) => ({ ...p, baseY: p.baseY + fit.lift }));
  }
}
