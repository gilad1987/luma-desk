import { parseFootprint } from '../../domain/stage/parse/parseFootprint';
import type { Key } from '../../domain/stage/parse/fieldReader';
import { allDefined, type Raw } from '../../domain/stage/parse/rawValues';
import { Reader } from '../../domain/stage/parse/readers';
import type { StageFixture } from '../../domain/stage/StageDesign';
import { linkOf, type FixtureLink, type LinkFootprint } from '../luma/lumaData';
import { linkFootprints, linkKeys, ownRotations } from './lumaStandIns';

/**
 * One link's footprint: channels checked like a stored show's (`parseFootprint`), size > 0, spec and mode text. Both
 * numbers are optional: a mode with no DMX footprint has no channels, and an older export has no size.
 */
function readFootprint(r: Reader, parent: Raw, key: Key, at: string): LinkFootprint | undefined {
  const o = r.obj(parent, key, at);
  if (o === undefined) return undefined;
  const path = r.path(at, key);
  const footprint = { gdtfSpec: r.str(o, 'gdtfSpec', path), gdtfMode: r.str(o, 'gdtfMode', path) };
  const channels = r.optional(o, 'channels', path, (raw, field, at) => parseFootprint(r, raw, field, at));
  const bodySize = r.optional(o, 'bodySize', path, r.positive);
  const counted = channels === undefined ? {} : { channels };
  const sized = bodySize === undefined ? {} : { bodySize };
  return allDefined(footprint) ? { ...footprint, ...counted, ...sized } : undefined;
}

/**
 * The links' footprints by fixture id; `undefined` when one is bad, so the whole data is rejected as any other
 * invalid field is. The stored-show parser drops unknown fixture keys, so it cannot check this MVR field for us.
 */
function readFootprints(raw: object): ReadonlyMap<unknown, LinkFootprint> | undefined {
  const r = new Reader();
  const entries = linkFootprints(raw).map(
    ([id, footprint]) => [id, readFootprint(r, { footprint }, 'footprint', `links.${String(id)}`)] as const,
  );
  if (r.errors.length > 0) return undefined;
  return new Map(entries.flatMap(([id, footprint]) => (footprint === undefined ? [] : [[id, footprint] as const])));
}

/**
 * The links of the data, one per checked stand-in, with the raw fields the stored-show parser drops: the footprint,
 * the `ownRotation` flag and the uuid key. `undefined` when a footprint is bad, so the whole data is rejected.
 */
export function readLinks(raw: object, standIns: readonly StageFixture[]): readonly FixtureLink[] | undefined {
  const footprints = readFootprints(raw);
  if (footprints === undefined) return undefined;
  const own = ownRotations(raw);
  const keys = linkKeys(raw);
  return standIns.map((fixture): FixtureLink => {
    const footprint = footprints.get(fixture.id);
    const link = { ...linkOf(fixture), ...(own.has(fixture.id) ? { ownRotation: true as const } : {}) };
    return { ...link, ...keys.get(fixture.id), ...(footprint === undefined ? {} : { footprint }) };
  });
}
