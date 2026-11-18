// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { importMvr } from '../../../src/mvr/index.ts';
import { gdtfMode, makeGdtf, makeGlb, makeMvr, sceneXml } from '../../shared/index.ts';

const BEAM = '<Geometry Name="Body"><Beam Name="Beam" BeamType="Wash" BeamAngle="20"/></Geometry>';
const channel = (attribute: string, index: number): readonly [string, string] => [attribute, `Offset="${index + 1}"`];
/** A real light: beam geometry, dimmer and colour mix. */
const WASH = makeGdtf({
  name: 'Thing',
  geometries: BEAM,
  modes: gdtfMode('Std', ['Dimmer', 'ColorAdd_R'].map(channel)),
});
const PLACEHOLDER = makeGdtf({
  name: 'Generic',
  geometries: '<Geometry Name="Body"/>',
  modes: gdtfMode('Std', ['Dimmer1'].map(channel)),
});

const fixture = (uuid: string, name: string, spec: string, extra: string): string =>
  `<Fixture uuid="${uuid}" name="${name}"><GDTFSpec>${spec}</GDTFSpec><GDTFMode>Std</GDTFMode>` +
  `<Addresses><Address break="0">${uuid.slice(1)}1</Address></Addresses>${extra}</Fixture>`;
const SHOW = makeMvr(
  sceneXml(
    `<Layer uuid="L1" name="Rig"><ChildList>${[
      fixture('F1', 'Wash 1', 'Acme@Thing', '<CustomId>0</CustomId><CustomIdType>0</CustomIdType>'),
      fixture('F2', 'Hazer 1', 'Acme@Thing', '<CustomId>12</CustomId><CustomIdType>7</CustomIdType>'),
      fixture('F3', 'Hoist 3', 'Acme@Chain Hoist', '<FixtureTypeId>4</FixtureTypeId>'),
    ].join('')}</ChildList></Layer>`,
  ),
  { 'Acme@Thing.gdtf': WASH, 'Acme@Chain Hoist.gdtf': PLACEHOLDER },
);

describe('a Fixture element that is no light', () => {
  it('becomes a device by its CustomIdType or by a name word, and keeps id and patch', async () => {
    const { design, summary } = await importMvr(SHOW, { name: 'Show.mvr' });
    expect(design.fixtures.map((f) => f.type)).toEqual(['par', 'device', 'device']);
    expect(design.fixtures.map((f) => f.patch?.address)).toEqual([11, 21, 31]);
    expect([summary.fixtureCount, summary.objectCount, summary.unpatchedCount]).toEqual([3, 0, 0]);
  });

  it('says what made each one a device', async () => {
    const { warnings } = await importMvr(SHOW, { name: 'Show.mvr' });
    const lines = warnings.filter((warning) => warning.code === 'non-light-fixture').map((warning) => warning.message);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('1 fixture of "Acme@Thing": the file marks it as not a light (CustomIdType)');
    expect(lines[1]).toContain('1 fixture of "Acme@Chain Hoist": the name says it is not a light');
  });

  it('stores the stand-in marker and the pool ids of the file with the design', async () => {
    const { design } = await importMvr(SHOW, { name: 'Show.mvr' });
    const infos = design.fixtures.map((f) => design.mvr?.fixtures[String(f.id)]);
    expect(infos.map((info) => info?.standIn)).toEqual([undefined, 'device', 'device']);
    expect(infos.map((info) => [info?.customId, info?.customIdType, info?.fixtureTypeId])).toEqual([
      [undefined, undefined, undefined],
      [12, 7, undefined],
      [undefined, undefined, 4],
    ]);
    expect(Object.keys(infos[0] ?? {})).not.toContain('customId');
  });
});

describe('a Fixture element that carries its own Geometries', () => {
  const glb = makeGlb({
    nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    accessors: [{ min: [0, 0, 0], max: [1, 1, 1] }],
  });
  const own = (file: string): string => `<Geometries><Geometry3D fileName="${file}"/></Geometries>`;
  const scene = sceneXml(
    `<Layer uuid="L1" name="Rig"><ChildList>${[
      fixture('F1', 'Wash 1', 'Acme@Thing', own('light.glb')),
      fixture('F2', 'Hazer 1', 'Acme@Thing', `<CustomIdType>7</CustomIdType>${own('hazer.glb')}`),
    ].join('')}</ChildList></Layer>`,
  );
  const mvr = makeMvr(scene, { 'Acme@Thing.gdtf': WASH, 'light.glb': glb, 'hazer.glb': glb });

  it('draws the geometry of a device, not that of a light, and counts the lights', async () => {
    const { geometry, warnings, design } = await importMvr(mvr, { name: 'Show.mvr' });
    expect(design.fixtures.map((f) => f.type)).toEqual(['par', 'device']);
    expect(geometry.placements.map((placement) => placement.file)).toEqual(['hazer.glb']);
    const line = warnings.find((warning) => warning.code === 'fixture-geometry');
    expect(line?.message).toContain('1 fixture carries its own geometry in the file');
  });
});
