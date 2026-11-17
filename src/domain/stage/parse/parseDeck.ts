import type { StageDeck, StageRiser } from '../StageDesign';
import { allDefined, type Raw } from './rawValues';
import type { Reader } from './readers';
import { UniqueIds } from './UniqueIds';

/** Reads the `deck` box of a stored design; an empty or inverted deck would leave nothing to stand on or light. */
export function parseDeck(r: Reader, stage: Raw): StageDeck | undefined {
  const at = 'deck';
  const o = r.obj(stage, at, '');
  if (!o) return undefined;
  const deck = {
    x0: r.num(o, 'x0', at),
    x1: r.num(o, 'x1', at),
    z0: r.num(o, 'z0', at),
    z1: r.num(o, 'z1', at),
    height: r.num(o, 'height', at),
  };
  if (!allDefined(deck)) return undefined;
  if (deck.x0 >= deck.x1) r.fail(r.path(at, 'x1'), `must be greater than x0 ${deck.x0}, got ${deck.x1}`);
  if (deck.z0 >= deck.z1) r.fail(r.path(at, 'z1'), `must be greater than z0 ${deck.z0}, got ${deck.z1}`);
  if (deck.height < 0) r.fail(r.path(at, 'height'), `must be 0 or more, got ${deck.height}`);
  return deck;
}

/**
 * Reads the `risers` list of a stored design. Riser ids must be unique, as the builder edits a riser by id, and every
 * size component must be above zero, as a riser is a box that beams land on.
 */
export function parseRisers(r: Reader, stage: Raw): StageRiser[] | undefined {
  const ids = new UniqueIds(r, r.str);
  return r.list(stage, 'risers', '', (items, i, at) => {
    const o = r.obj(items, i, at);
    if (!o) return undefined;
    const path = r.path(at, i);
    const riser = { id: ids.take(o, path), at: r.vec3(o, 'at', path), size: r.size(o, 'size', path) };
    return allDefined(riser) ? riser : undefined;
  });
}
