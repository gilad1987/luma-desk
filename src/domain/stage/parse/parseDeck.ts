import type { StageDeck, StageRiser } from '../StageDesign';
import { allDefined } from './rawValues';
import type { Reader } from './readers';
import { uniqueId } from './uniqueId';

/** Reads the `deck` box of a stored design; an empty or inverted deck would leave nothing to stand on or light. */
export function parseDeck(r: Reader, raw: unknown): StageDeck | undefined {
  const o = r.obj(raw, 'deck');
  if (!o) return undefined;
  const deck = {
    x0: r.num(o.x0, 'deck.x0'),
    x1: r.num(o.x1, 'deck.x1'),
    z0: r.num(o.z0, 'deck.z0'),
    z1: r.num(o.z1, 'deck.z1'),
    height: r.num(o.height, 'deck.height'),
  };
  if (!allDefined(deck)) return undefined;
  if (deck.x0 >= deck.x1) r.fail('deck.x1', `must be greater than x0 ${deck.x0}, got ${deck.x1}`);
  if (deck.z0 >= deck.z1) r.fail('deck.z1', `must be greater than z0 ${deck.z0}, got ${deck.z1}`);
  if (deck.height < 0) r.fail('deck.height', `must be 0 or more, got ${deck.height}`);
  return deck;
}

/**
 * Reads the `risers` list of a stored design. Riser ids must be unique, as the builder edits a riser by id, and every
 * size component must be above zero, as a riser is a box that beams land on.
 */
export function parseRisers(r: Reader, raw: unknown): StageRiser[] | undefined {
  const ids = new Set<string>();
  return r.list(raw, 'risers', (v, path) => {
    const o = r.obj(v, path);
    if (!o) return undefined;
    const riser = {
      id: uniqueId(r, ids, r.str(o.id, `${path}.id`), `${path}.id`),
      at: r.vec3(o.at, `${path}.at`),
      size: r.size(o.size, `${path}.size`),
    };
    return allDefined(riser) ? riser : undefined;
  });
}
