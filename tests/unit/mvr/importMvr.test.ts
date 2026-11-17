// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { importMvr } from '../../../src/mvr/index.ts';
import { gdtfMode, make3ds, makeGdtf, makeGlb, makeMvr, sceneXml } from '../../shared/index.ts';

const BEAM = '<Geometry Name="Body"><Beam Name="Beam" BeamType="Spot" BeamAngle="20"/></Geometry>';
const SPOT_MODE = gdtfMode('Std', [
  ['Dimmer', 'Offset="1"'],
  ['Pan', 'Offset="2"'],
  ['Tilt', 'Offset="3"'],
]);
const GLB = makeGlb({
  nodes: [{ mesh: 0 }],
  meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
  accessors: [{ min: [0, 0, 0], max: [1, 1, 1] }],
});

const fixture = (uuid: string, spec: string, mode: string, addresses: string): string =>
  `<Fixture uuid="${uuid}" name="${uuid}"><GDTFSpec>${spec}</GDTFSpec><GDTFMode>${mode}</GDTFMode>` +
  `<Addresses>${addresses}</Addresses></Fixture>`;
const at = (value: string, dmxBreak = 0): string => `<Address break="${dmxBreak}">${value}</Address>`;
const mesh = (file: string): string => `<Geometry3D fileName="${file}"/>`;
const symbol = (symdef: string): string => `<Symbol uuid="i-${symdef}" symdef="${symdef}"/>`;

const SCENE = sceneXml(
  `<Layer uuid="L1" name="Rig"><ChildList>
    ${fixture('F1', 'Acme@Spot', 'Std', at('513'))}
    ${fixture('F2', 'Acme@Spot.gdtf', 'Nope', at('0'))}
    ${fixture('F3', 'Ghost@Wash', '', at('1') + at('5', 1))}
    ${fixture('F4', 'Ghost@Wash', '', '')}
    ${fixture('F5', 'Acme@Box', 'Std', at('20'))}
    <SceneObject uuid="S1"><Geometries>${symbol('SD1')}${symbol('missing')}</Geometries></SceneObject>
    <Truss uuid="T1"><Geometries>${mesh('truss')}</Geometries></Truss>
    <Speaker uuid="SP1"><Geometries>${mesh('speaker.glb')}</Geometries></Speaker>
  </ChildList></Layer>`,
  `<Symdef uuid="SD1"><ChildList>${mesh('box.glb')}${mesh('box.glb')}</ChildList></Symdef>`,
);

const MVR = makeMvr(SCENE, {
  'Acme@Spot.gdtf': makeGdtf({ geometries: BEAM, modes: SPOT_MODE }),
  'Acme@Box.gdtf': makeGdtf({ geometries: '<Geometry Name="Body"/>', modes: gdtfMode('Std', []) }),
  'box.glb': GLB,
  'speaker.glb': GLB,
  truss: make3ds([
    [0, 0, 0],
    [3000, 300, 300],
  ]),
});

describe('importMvr', () => {
  it('turns lights into desk fixtures and counts objects, patches and missing GDTFs', async () => {
    const { summary, design } = await importMvr(MVR, { name: 'Show.mvr', fileHash: 'abc' });
    expect(summary).toEqual({
      fixtureCount: 4,
      unpatchedCount: 2,
      missingGdtfCount: 2,
      objectCount: 4,
      placementCount: 4,
      layerCount: 1,
      noGeometry: false,
    });
    expect(design.source).toEqual({ kind: 'mvr', name: 'Show.mvr', fileHash: 'abc' });
    expect(design.fixtures.map((f) => f.type)).toEqual(['spot', 'spot', 'par', 'par']);
    expect(design.fixtures.map((f) => f.patch)).toEqual([
      { universe: 2, address: 1, mode: 'Std' },
      undefined,
      { universe: 1, address: 1, mode: '' },
      undefined,
    ]);
  });

  it('keeps every Symbol-expanded mesh and the object kinds', async () => {
    const { geometry } = await importMvr(MVR, { name: 'Show.mvr' });
    const kinds = geometry.placements.map((p) => `${p.kind}:${p.file}`);
    expect(kinds).toEqual(['SceneObject:box.glb', 'SceneObject:box.glb', 'Truss:truss', 'Speaker:speaker.glb']);
    expect(geometry.surfaces.length).toBeGreaterThan(0);
  });

  it('orders warnings by step and gives one missing-gdtf warning per spec', async () => {
    const { warnings } = await importMvr(MVR, { name: 'Show.mvr' });
    expect(warnings.map((w) => w.code)).toEqual(['missing-symdef', 'missing-gdtf', 'unknown-mode', 'multi-break']);
    expect(warnings[1]?.ref).toBe('Ghost@Wash');
    expect(warnings[1]?.message).toContain('2 fixture');
  });
});
