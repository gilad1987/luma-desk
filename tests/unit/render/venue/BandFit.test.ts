import { Group, Mesh, Object3D } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { deckFitOf, IDENTITY_FIT } from '../../../../src/domain/stage/deckFit';
import { DECK, STAGE } from '../../../../src/domain/venue';
import { BandFit } from '../../../../src/render/venue/BandFit';

const performer = () => ({ body: new Group(), head: new Mesh(), baseY: 2, facing: 0, phase: 0, bounce: 0, sway: 0 });

/** A riser at the deck centre line, a wedge at x 6 on the downstage edge, and one band member. */
function band() {
  const riser = new Object3D();
  riser.userData['riser'] = 1;
  riser.position.set(0, DECK + 0.25, STAGE.z0);
  const wedge = new Object3D();
  wedge.position.set(6, DECK + 0.25, STAGE.z1);
  const performers = [performer()];
  return { riser, wedge, performers, fit: new BandFit([riser, wedge], performers) };
}

/** A deck twice as wide and deep as the built-in one, 1 m higher, with the same downstage edge. */
const wideDeck = {
  x0: STAGE.x0 * 2,
  x1: STAGE.x1 * 2,
  z0: STAGE.z1 - (STAGE.z1 - STAGE.z0) * 2,
  z1: STAGE.z1,
  height: DECK + 1,
};

describe('BandFit', () => {
  it('skips the pass at the identity fit: no placement is read or written', () => {
    const { riser, wedge, performers, fit } = band();
    const read = vi.spyOn(riser.position, 'set');
    expect(fit.fit(IDENTITY_FIT)).toBe(performers);
    expect(read).not.toHaveBeenCalled();
    expect(wedge.position.toArray()).toEqual([6, DECK + 0.25, STAGE.z1]);
  });

  it('moves the band onto a wide deck: x by width, z from the downstage edge, lifted by the height change', () => {
    const { riser, wedge, fit } = band();
    const [moved] = fit.fit(deckFitOf(wideDeck));
    expect(wedge.position.x).toBeCloseTo(12);
    expect(wedge.position.z).toBeCloseTo(STAGE.z1);
    expect(wedge.position.y).toBeCloseTo(DECK + 1.25);
    expect(riser.position.z).toBeCloseTo(wideDeck.z0);
    expect([riser.scale.x, riser.scale.z]).toEqual([2, 2]);
    expect(moved?.baseY).toBeCloseTo(3);
  });

  it('starts each fit from the built placement, so fits never stack', () => {
    const { wedge, fit } = band();
    fit.fit(deckFitOf(wideDeck));
    fit.fit(deckFitOf(wideDeck));
    expect(wedge.position.x).toBeCloseTo(12);
    fit.fit(IDENTITY_FIT);
    expect(wedge.position.toArray()).toEqual([6, DECK + 0.25, STAGE.z1]);
  });
});
