/**
 * Owns `onDeck` and the fit a frame carries: the identity fit returns a point unchanged (a -0 stays -0, so the
 * built-in presets keep every aim angle), and another fit moves the built-in deck corners onto the new deck corners.
 */
import { describe, expect, it } from 'vitest';
import { deckFitOf, IDENTITY_FIT, onDeck } from '../../../../src/domain/stage/deckFit.ts';
import { frameOf } from '../../../../src/domain/stage/StageFrame.ts';
import { createTemplate } from '../../../../src/domain/stage/templates/index.ts';
import { STAGE } from '../../../../src/domain/venue.ts';

describe('onDeck', () => {
  it('gives the built-in frame the identity fit', () => {
    expect(frameOf(createTemplate('sultans-pool')).fit).toEqual(IDENTITY_FIT);
  });

  it('returns the point unchanged for the identity fit, the sign of zero included', () => {
    const [x, z] = onDeck(IDENTITY_FIT, -0, -13.2);
    expect(Object.is(x, -0)).toBe(true);
    expect(z).toBe(-13.2);
  });

  it('moves the built-in deck corners onto the corners of another deck', () => {
    const deck = { x0: 5, x1: 15, z0: -8, z1: 2, height: 1 };
    const fit = deckFitOf(deck);
    const [x0, z0] = onDeck(fit, STAGE.x0, STAGE.z0);
    const [x1, z1] = onDeck(fit, STAGE.x1, STAGE.z1);
    [x0, z0, x1, z1].forEach((v, i) => expect(v).toBeCloseTo([deck.x0, deck.z0, deck.x1, deck.z1][i] ?? NaN, 12));
  });
});
