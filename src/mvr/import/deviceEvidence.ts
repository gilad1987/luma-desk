import type { MvrFixtureRecord } from '../scene/MvrScene';
import type { FixtureClass } from './classifyFixture';

/**
 * The MVR `CustomIdType` values that name a thing which is no light (MVR spec, "CustomID Types"): 5 NonDim, 7 Fog,
 * 9 Pyro and 10 Marker. 6 Media and 8 Effect are not in the list: a media server drives a screen and an effect can
 * be a light, so for those the GDTF decides.
 */
const DEVICE_ID_TYPES: ReadonlySet<number> = new Set([5, 7, 9, 10]);

/**
 * `kind`, or a `device` when the file itself says the fixture is no light. The file's own statement comes before the
 * GDTF, because the user set it in the program that wrote the file, and a placeholder GDTF cannot say it.
 */
export function withCustomId<T extends FixtureClass>(record: MvrFixtureRecord, kind: T): T {
  if (record.customIdType === undefined || !DEVICE_ID_TYPES.has(record.customIdType)) return kind;
  return { ...kind, type: 'device', fromName: false, standIn: 'device', deviceBy: 'custom-id' };
}
