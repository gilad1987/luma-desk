import type { StageDesign, StageFixture } from '../../domain/stage/StageDesign';
import type { Vec3 } from '../../domain/stage/types';
import { LUMA_DATA_VERSION, LUMA_PROVIDER, linkOf, type FixtureLink } from '../luma/lumaData';
import type { OriginalProvider } from '../luma/lumaData';
import { gdtfIdentity } from './gdtfIdentity';
import { xmlElement, xmlText } from './xmlWriter';

/**
 * The fixture's link with its imported footprint and body size, kept only while the export still writes the imported
 * GDTF name and mode: after a re-type both belong to another product, and the next import would trust them. The
 * footprint names the spec and mode written, so the import can tell when another tool changed them. The body size
 * rides in it because the export took the scaled mount shift off the matrix, and the import needs the same size to
 * put the body back where it was. A mode with no DMX footprint still carries its body size, without `channels`.
 */
function linkWithFootprint(fixture: StageFixture, design: StageDesign): FixtureLink {
  const info = design.mvr?.fixtures[String(fixture.id)];
  const gdtf = gdtfIdentity(fixture, design.mvr);
  if (info === undefined || (info.footprint === undefined && info.bodySize === undefined) || !gdtf.imported) {
    return linkOf(fixture);
  }
  const counted = info.footprint === undefined ? {} : { channels: info.footprint };
  const sized = info.bodySize === undefined ? {} : { bodySize: info.bodySize };
  return { ...linkOf(fixture), footprint: { ...counted, ...sized, gdtfSpec: gdtf.spec, gdtfMode: gdtf.mode } };
}

/**
 * The root `<UserData>` element with the stage parts as JSON in `<Data provider="LUMA DESK" ver="1">`. MVR lets a
 * provider put its own data there and other readers skip it, so a desk export can come back to the desk complete.
 * `offset` is the one the export takes off every point; `hiddenLayers` is written only for a design with MVR facts.
 */
export function writeLumaData(
  design: StageDesign,
  offset: Vec3,
  unpatched: ReadonlyMap<string, number> = new Map(),
  originalProvider?: OriginalProvider,
): string {
  const { venue, scenery, deck, screens, risers, trusses } = design;
  const links = design.fixtures.map((fixture) => linkWithFootprint(fixture, design));
  const hidden = design.mvr ? { hiddenLayers: design.mvr.hiddenLayers } : {};
  // By fixture key, the desk's break of each fixture written without a patch beside kept breaks (`unpatchedBreaksOf`).
  const open = unpatched.size > 0 ? { unpatchedBreaks: Object.fromEntries(unpatched) } : {};
  // Who wrote the file a pass-through export started from; the root names the desk now (`nameExporter`).
  const origin = originalProvider ? { originalProvider } : {};
  const parts = { venue, scenery, deck, screens, risers, trusses, offset, links, ...hidden, ...open, ...origin };
  const json = JSON.stringify(parts);
  return xmlElement('UserData', {}, [xmlText('Data', json, { provider: LUMA_PROVIDER, ver: LUMA_DATA_VERSION })]);
}
