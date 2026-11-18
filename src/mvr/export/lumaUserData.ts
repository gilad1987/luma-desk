import type { StageDesign, StageFixture } from '../../domain/stage/StageDesign';
import type { Vec3 } from '../../domain/stage/types';
import { LUMA_DATA_VERSION, LUMA_PROVIDER, linkOf, type FixtureLink } from '../luma/lumaData';
import { gdtfIdentity } from './gdtfIdentity';
import { xmlElement, xmlText } from './xmlWriter';

/**
 * The fixture's link with its imported footprint, kept only while the export still writes the imported GDTF name and
 * mode: after a re-type the footprint belongs to another product, and the next import would trust it. The footprint
 * names the spec and mode written, so the import can tell when another tool changed them.
 */
function linkWithFootprint(fixture: StageFixture, design: StageDesign): FixtureLink {
  const channels = design.mvr?.fixtures[String(fixture.id)]?.footprint;
  const gdtf = gdtfIdentity(fixture, design.mvr);
  if (channels === undefined || !gdtf.imported) return linkOf(fixture);
  return { ...linkOf(fixture), footprint: { channels, gdtfSpec: gdtf.spec, gdtfMode: gdtf.mode } };
}

/**
 * The root `<UserData>` element with the stage parts as JSON in `<Data provider="LUMA DESK" ver="1">`. MVR lets a
 * provider put its own data there and other readers skip it, so a desk export can come back to the desk complete.
 * `offset` is the one the export takes off every point; `hiddenLayers` is written only for a design with MVR facts.
 */
export function writeLumaData(design: StageDesign, offset: Vec3): string {
  const { venue, scenery, deck, screens, risers, trusses } = design;
  const links = design.fixtures.map((fixture) => linkWithFootprint(fixture, design));
  const hidden = design.mvr ? { hiddenLayers: design.mvr.hiddenLayers } : {};
  const json = JSON.stringify({ venue, scenery, deck, screens, risers, trusses, offset, links, ...hidden });
  return xmlElement('UserData', {}, [xmlText('Data', json, { provider: LUMA_PROVIDER, ver: LUMA_DATA_VERSION })]);
}
