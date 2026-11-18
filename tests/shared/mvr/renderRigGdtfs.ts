import { gdtfMode } from './gdtfMode';
import { makeZip } from './makeZip';

/** One fixture type of the render rig: its spec name, GDTF type name, body size in metres, beam and channels. */
interface RigType {
  readonly spec: string;
  readonly name: string;
  readonly size: readonly [length: number, width: number, height: number];
  readonly beam: string;
  readonly channels: readonly (readonly [string, string])[];
}

const channels = (...attributes: string[]): [string, string][] =>
  attributes.map((attribute, i) => [attribute, `Offset="${i + 1}"`]);
const COLOUR = ['ColorAdd_R', 'ColorAdd_G', 'ColorAdd_B'];

/** Moving spot, moving wash and LED bar under an invented maker, so the types come from the names and channels. */
export const RIG_TYPES = {
  spot: {
    spec: 'Nimbus@SpotMover',
    name: 'Spot Mover',
    size: [0.42, 0.3, 0.62],
    beam: 'BeamType="Spot" BeamAngle="18"',
    channels: channels('Dimmer', 'Pan', 'Tilt', ...COLOUR),
  },
  wash: {
    spec: 'Nimbus@WashMover',
    name: 'Wash Mover',
    size: [0.36, 0.36, 0.5],
    beam: 'BeamType="Wash" BeamAngle="40"',
    channels: channels('Dimmer', 'Pan', 'Tilt', ...COLOUR),
  },
  bar: {
    spec: 'Nimbus@LEDBar',
    name: 'LED Bar',
    size: [1, 0.1, 0.12],
    beam: 'BeamType="Wash" BeamAngle="25"',
    channels: channels('Dimmer', ...COLOUR),
  },
} as const satisfies Record<string, RigType>;

/** A `.gdtf` whose body geometry points at a `<Model>` with real dimensions, as most maker files have. */
function rigGdtf({ name, size: [length, width, height], beam, channels }: RigType): Uint8Array {
  const xml =
    '<?xml version="1.0" encoding="UTF-8"?><GDTF DataVersion="1.2">' +
    `<FixtureType Name="${name}" Manufacturer="Nimbus">` +
    `<Models><Model Name="Body" Length="${length}" Width="${width}" Height="${height}"/></Models>` +
    `<Geometries><Geometry Name="Body" Model="Body"><Beam Name="Beam" ${beam}/></Geometry></Geometries>` +
    `<DMXModes>${gdtfMode('Std', channels)}</DMXModes>` +
    '</FixtureType></GDTF>';
  return makeZip({ 'description.xml': xml });
}

/** The archive entries of the three GDTFs, named `<spec>.gdtf` as MVR writers name them. */
export function rigGdtfFiles(): Record<string, Uint8Array> {
  return Object.fromEntries(Object.values(RIG_TYPES).map((type) => [`${type.spec}.gdtf`, rigGdtf(type)]));
}
