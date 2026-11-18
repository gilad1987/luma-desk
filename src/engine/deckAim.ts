import { aimAt } from '../domain/aim';
import type { AttrValues } from '../domain/attributes';
import type { Fixture } from '../domain/Fixture';
import { fromDeck, onDeck, type DeckFit } from '../domain/stage/deckFit';

/**
 * A deck target in built-in deck metres (x, y, z), computed from the plan point (`x`, `z`) where the fixture would
 * hang on the built-in deck. The y is a height above the venue floor and is not fitted.
 */
export type DeckTarget = (x: number, z: number) => readonly [x: number, y: number, z: number];

/**
 * An `aimAt` for deck targets on the deck of `fit`. The fixture of a custom stage already hangs on the new deck, so its
 * place goes back to built-in metres (`fromDeck`) before the target formula reads it, and only the target moves onto
 * the deck (`onDeck`). Fitting the fixture's place forward instead would scale it twice. The identity fit moves
 * nothing either way, so the built-in presets keep their exact numbers.
 */
export function deckAimOf(fit: DeckFit): (f: Fixture, target: DeckTarget) => AttrValues {
  return (f, target) => {
    const [builtInX, builtInZ] = fromDeck(fit, f.pos.x, f.pos.z);
    const [x, y, z] = target(builtInX, builtInZ);
    const [deckX, deckZ] = onDeck(fit, x, z);
    return aimAt(f, deckX, y, deckZ);
  };
}
