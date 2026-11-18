// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { importMvr } from '../../../src/mvr/index.ts';
import { exportRoundTrip, gdtfMode, makeGdtf, makeMvr, sceneXml } from '../../shared/index.ts';

/** The one geometry of a placeholder GDTF: no `Beam` under it. */
const BODY = '<Geometry Name="Body"/>';
const mode = (...attributes: string[]): string =>
  gdtfMode(
    'Std',
    attributes.map((attribute, index) => [attribute, `Offset="${index + 1}"`] as const),
  );

/** A program's stand-in for a product it has no GDTF for: numbered dimmers, none named `Dimmer`. */
const PLACEHOLDER = makeGdtf({
  name: 'Generic',
  geometries: BODY,
  modes: mode('Dimmer1', 'Dimmer2', 'Dimmer3', 'Dimmer4'),
});
const STUB = makeGdtf({ name: 'Generic', geometries: BODY, modes: mode('Dimmer') });
/** A real file of a device that is no light: its channels are GDTF fog attributes, and it has no beam. */
const HAZER = makeGdtf({ name: 'Haze 2', geometries: BODY, modes: mode('Fog1', 'Fan1') });

const fixture = (uuid: string, name: string, spec: string, address: number): string =>
  `<Fixture uuid="${uuid}" name="${name}"><GDTFSpec>${spec}</GDTFSpec><GDTFMode>Std</GDTFMode>` +
  `<Addresses><Address break="0">${address}</Address></Addresses></Fixture>`;

const layer = (...fixtures: string[]): string =>
  `<Layer uuid="L1" name="Rig"><ChildList>${fixtures.join('')}</ChildList></Layer>`;
const FILES = { 'Acme@Stage Wash 12.gdtf': PLACEHOLDER, 'Acme@Unit 4.gdtf': PLACEHOLDER, 'Acme@Single.gdtf': STUB };
const SHOW = makeMvr(
  sceneXml(
    layer(
      fixture('F1', 'Left 1', 'Acme@Stage Wash 12', 1),
      fixture('F2', 'Left 2', 'Acme@Stage Wash 12', 11),
      fixture('F3', 'Left 3', 'Acme@Stage Wash 12', 21),
      fixture('F4', 'Unit A', 'Acme@Unit 4', 31),
      fixture('F5', 'Unit B', 'Acme@Unit 4', 41),
      fixture('F6', 'Front Blinder', 'Acme@Single', 51),
      fixture('F7', 'Haze L', 'Acme@Haze', 513),
    ),
  ),
  { ...FILES, 'Acme@Haze.gdtf': HAZER },
);

const open = (): ReturnType<typeof importMvr> => importMvr(SHOW, { name: 'Show.mvr' });
const lines = async (code: string): Promise<string[]> =>
  (await open()).warnings.filter((warning) => warning.code === code).map((warning) => warning.message);

describe('a Fixture element with a placeholder GDTF', () => {
  it('stays a fixture with its patch and never becomes an object', async () => {
    const { summary, design } = await open();
    expect(summary.fixtureCount).toBe(7);
    expect(summary.objectCount).toBe(0);
    expect(summary.unpatchedCount).toBe(0);
    expect(design.fixtures.map((f) => f.patch?.address)).toEqual([1, 11, 21, 31, 41, 51, 1]);
    expect(design.fixtures.map((f) => f.patch?.universe)).toEqual([1, 1, 1, 1, 1, 1, 2]);
  });

  it('takes its type from the name, else a generic type, and reads numbered dimmers as dimmers', async () => {
    const { design } = await open();
    expect(design.fixtures.map((f) => f.type)).toEqual(['wash', 'wash', 'wash', 'par', 'par', 'blinder', 'device']);
  });

  it('reports the placeholder fixtures grouped, with counts that add up', async () => {
    expect(await lines('placeholder-gdtf')).toEqual([
      '3 fixtures of "Acme@Stage Wash 12": the GDTF is a placeholder; the type comes from the fixture name ("Wash").',
      '2 fixtures of "Acme@Unit 4": the GDTF is a placeholder; a generic 4-channel type is used ("LED Par").',
      '1 fixture of "Acme@Single": the GDTF is a placeholder; the type comes from the fixture name ("Blinder 4L").',
    ]);
    expect(await lines('type-from-name')).toEqual([]);
  });

  it('keeps a device that is no light as a fixture and says so', async () => {
    const [line, ...rest] = await lines('non-light-fixture');
    expect(rest).toEqual([]);
    expect(line).toContain('1 fixture of "Acme@Haze": the GDTF has no beam and no light channel');
    expect(line).toContain('it stays a fixture with id and patch, shown as "Device", and emits no light.');
  });

  it('exports every fixture with its patch', async () => {
    const { design } = await open();
    const { result } = await exportRoundTrip(design);
    expect(result.summary.fixtureCount).toBe(7);
    expect(result.design.fixtures.map((f) => [f.patch?.universe, f.patch?.address])).toEqual(
      design.fixtures.map((f) => [f.patch?.universe, f.patch?.address]),
    );
  });
});
