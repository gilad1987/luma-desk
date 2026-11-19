// @vitest-environment jsdom
/**
 * Whatever a GDTF writes, the optics the import stores must load again: a saved show whose optics the design parser
 * rejects does not open. Every optional attribute the optics read is set, one at a time, to each edge value, and the
 * result must parse back with no error and unchanged.
 */
import { describe, expect, it } from 'vitest';
import type { FixtureOptics } from '../../../src/domain/stage/optics/FixtureOptics.ts';
import { parseOptics } from '../../../src/domain/stage/parse/optics/parseOptics.ts';
import type { Raw } from '../../../src/domain/stage/parse/rawValues.ts';
import { Reader } from '../../../src/domain/stage/parse/readers.ts';
import { opticsOf } from '../../shared/index.ts';

type Attrs = Readonly<Record<string, string | undefined>>;
type Part = 'beam' | 'emitter' | 'filter' | 'slot' | 'channel' | 'fn' | 'set' | 'ref';

const BASE: Readonly<Record<Part, Attrs>> = {
  beam: {
    ...{ BeamType: 'Rectangle', LampType: 'LED', BeamAngle: '20', FieldAngle: '30', BeamRadius: '0.05' },
    ...{ RectangleRatio: '1.7', ThrowRatio: '1', LuminousFlux: '9000', PowerConsumption: '300' },
    ...{ ColorTemperature: '6500', ColorRenderingIndex: '90' },
  },
  emitter: { Name: 'Red', Color: '0.7,0.3,20', DominantWaveLength: '630' },
  filter: { Name: 'Cyan', Color: '0.2,0.3,40' },
  slot: { Name: 'Red', Color: '0.6,0.3,20', MediaFileName: 'red' },
  channel: { DMXBreak: '1', Offset: '1,2', InitialFunction: 'Body_Zoom.Zoom.Wide' },
  fn: { Name: 'Wide', DMXFrom: '0/1', Default: '128/1', PhysicalFrom: '10', PhysicalTo: '120' },
  set: { DMXFrom: '0/1', WheelSlotIndex: '1' },
  ref: { DMXBreak: '1', DMXOffset: '40' },
};
/** The spec defaults of the `Beam` (LampType Discharge ... ColorRenderingIndex 100) and of a channel function. */
const DEFAULTS: Attrs = {
  ...{ BeamType: 'Wash', LampType: 'Discharge', BeamAngle: '25', FieldAngle: '25', BeamRadius: '0.05' },
  ...{ LuminousFlux: '10000', PowerConsumption: '1000', ColorTemperature: '6000', ColorRenderingIndex: '100' },
  ...{ PhysicalFrom: '0', PhysicalTo: '1', DMXFrom: '0/1', Default: '0/1', Color: '0.3127,0.3290,100' },
};
const EDGES: readonly (string | undefined)[] = ['0', '-1', 'NaN', 'abc', '', ' ', '1e999', undefined];
const ATTRIBUTES = ['Dimmer', 'Pan', 'Tilt', 'Zoom', 'ColorAdd_R', 'ColorSub_C', 'Color1', 'Gobo1', 'Prism1', 'CTO'];
const MORE = ['Iris', 'Frost1', 'Shutter1', 'Shutter1Strobe', 'ColorRGB_Red'];

const render = (attrs: Attrs): string =>
  Object.entries(attrs)
    .flatMap(([key, value]) => (value === undefined ? [] : [`${key}="${value}"`]))
    .join(' ');

/** A channel with a function, a channel set and a second function behind a `ModeMaster`; `ColorAdd_G` is per pixel. */
function channelXml(parts: Readonly<Record<Part, Attrs>>, attribute: string, index: number): string {
  const fn = render({ ...parts.fn, Attribute: attribute, Emitter: 'Red', Filter: 'Cyan', Wheel: 'Wheel' });
  const master = render({ ...parts.fn, Name: 'Narrow', Attribute: attribute, ModeMaster: 'Body_Dimmer' });
  const geometry = attribute === 'ColorAdd_G' ? 'Pixel' : 'Body';
  const ch = render({ Offset: `${index * 2 + 1},${index * 2 + 2}`, ...parts.channel, Geometry: geometry });
  return (
    `<DMXChannel ${ch}><LogicalChannel Attribute="${attribute}"><ChannelFunction ${fn}>` +
    `<ChannelSet Name="A" ${render(parts.set)}/></ChannelFunction><ChannelFunction ${master} ` +
    'ModeFrom="0/1" ModeTo="127/1"/></LogicalChannel></DMXChannel>'
  );
}

/** The optics of a GDTF whose `part` has `key` set to `value` (absent for `undefined`), all else `BASE`. */
function opticsWith(part: Part, key: string, value: string | undefined): FixtureOptics | undefined {
  const parts = { ...BASE, [part]: { ...BASE[part], [key]: value } };
  const channels = [...ATTRIBUTES, ...MORE, 'ColorAdd_G'].map((attribute, index) =>
    channelXml(parts, attribute, index),
  );
  const pixel = `<GeometryReference Name="P1" Geometry="Pixel"><Break ${render(parts.ref)}/></GeometryReference>`;
  return opticsOf({
    geometries: `<Geometry Name="Body"><Beam Name="Beam" ${render(parts.beam)}/>${pixel}</Geometry><Geometry Name="Pixel"/>`,
    physical: `<Emitters><Emitter ${render(parts.emitter)}/></Emitters><Filters><Filter ${render(parts.filter)}/></Filters>`,
    wheels: `<Wheel Name="Wheel"><Slot ${render(parts.slot)}><Facet/></Slot><Slot Name="Open"/></Wheel>`,
    modes: `<DMXMode Name="Std" Geometry="Body"><DMXChannels>${channels.join('')}</DMXChannels></DMXMode>`,
  }).optics;
}

/** The optics as a saved show holds them, parsed back: the errors, the result and the saved JSON. */
function parseBack(optics: FixtureOptics | undefined): { errors: string[]; parsed: unknown; saved: unknown } {
  const saved = JSON.parse(JSON.stringify({ optics })) as Raw;
  const reader = new Reader();
  const parsed = reader.optional(saved, 'optics', '', (o, key, at) => parseOptics(reader, o, key, at));
  return { errors: reader.errors, parsed, saved: saved['optics'] };
}

const CASES = (Object.keys(BASE) as Part[]).flatMap((part) =>
  Object.keys(BASE[part]).flatMap((key) => [...EDGES, DEFAULTS[key]].map((value) => [part, key, value] as const)),
);

describe('the stored optics of any GDTF load again', () => {
  it('builds optics with every part from the base GDTF', () => {
    const optics = opticsWith('beam', 'BeamType', 'Rectangle');
    expect(optics?.color?.emitters?.map((emitter) => emitter.drives.length)).toEqual([1, 1]);
    expect(Object.keys(optics ?? {})).toHaveLength(10);
  });

  it.each(CASES)('parses back with %s %s="%s"', (part, key, value) => {
    const { errors, parsed, saved } = parseBack(opticsWith(part, key, value));
    expect(errors).toEqual([]);
    expect(parsed).toEqual(saved);
  });
});
