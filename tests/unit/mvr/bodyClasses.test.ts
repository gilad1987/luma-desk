// @vitest-environment jsdom
/**
 * The body class of each fixture in an import, the trust flags behind it, the body size, and the summary lines
 * grouped per product and class. Geometry trust is apart from type trust: a `Custom@` GDTF gives a size and a mesh.
 * All products are invented.
 */
import { describe, expect, it } from 'vitest';
import { importMvr } from '../../../src/mvr/index.ts';
import { gdtfMode, makeGdtf, makeGlb, makeMvr, sceneXml } from '../../shared/index.ts';

const MODES = gdtfMode('Std', [
  ['Dimmer', 'Offset="1"'],
  ['Pan', 'Offset="2"'],
]);
const GEOMETRIES = '<Geometry Name="Body" Model="Body"><Beam Name="Beam" BeamType="Spot" BeamAngle="20"/></Geometry>';
const sized = (width: number): string => `<Model Name="Body" Length="0.3" Width="${width}" Height="0.5" File="body"/>`;
const glb = (node: object): Uint8Array => makeGlb({ scene: 0, scenes: [{ nodes: [0] }], nodes: [node] });
const gdtf = (name: string, models: string, mesh?: Uint8Array): Uint8Array =>
  makeGdtf({ name, models, geometries: GEOMETRIES, modes: MODES, files: mesh ? { 'models/gltf/body.glb': mesh } : {} });
const FILES = {
  'Acme@Mover.gdtf': gdtf('Mover', sized(0.3), glb({})),
  'Custom@Symbol.gdtf': gdtf('Symbol', sized(0.3), glb({})),
  'Custom@Posed.gdtf': gdtf('Posed', sized(0.3), glb({ rotation: [0.258819, 0, 0, 0.965926] })),
  'Acme@Boxes.gdtf': gdtf('Boxes', sized(0.3)),
  'Acme@Huge.gdtf': gdtf('Huge', sized(1136), glb({})),
  'Acme@Stub.gdtf': gdtf('Stub', '<Model Name="Body" File=""/>'),
};
const SPECS = ['Acme@Mover', 'Custom@Symbol', 'Custom@Posed', 'Acme@Boxes', 'Acme@Huge', 'Acme@Stub', 'Zenith@Gone'];
const fixture = (spec: string, index: number): string =>
  `<Fixture uuid="U-${index}" name="Light ${index}"><Matrix>{1,0,0}{0,1,0}{0,0,1}{${index * 1000},0,5000}</Matrix>` +
  `<GDTFSpec>${spec}</GDTFSpec><GDTFMode>Std</GDTFMode><FixtureID>${index + 1}</FixtureID></Fixture>`;
// the first product is used twice, so one line has a count above 1
const USED = [...SPECS, 'Acme@Mover'];
const SCENE = sceneXml(`<Layer uuid="L1" name="Rig"><ChildList>${USED.map(fixture).join('')}</ChildList></Layer>`);
const load = () => importMvr(makeMvr(SCENE, FILES), { name: 'Bodies.mvr' });

describe('fixture body classes of an import', () => {
  it('gives each fixture its class, with the reason and the flags', async () => {
    const { bodies } = await load();
    const facts = USED.map((_, index) => bodies.get(`U-${index}`));
    expect(facts.map((body) => body?.bodyClass)).toEqual([
      'mesh',
      'meshVendorSymbol',
      'suspect',
      'boxes',
      'suspect',
      'none',
      'none',
      'mesh',
    ]);
    expect(facts.map((body) => body?.reason)).toEqual([
      undefined,
      undefined,
      'bakedPose',
      undefined,
      'unitSuspect',
      undefined,
      undefined,
      undefined,
    ]);
    expect(facts.map((body) => body?.flags)).toEqual([
      [],
      [],
      ['bakedPose'],
      ['noMesh'],
      ['unitSuspect'],
      ['stub'],
      [],
      [],
    ]);
    expect(facts[6]?.body).toBeUndefined();
    expect(facts[1]?.body?.root?.model?.path).toBe('models/gltf/body.glb');
  });

  it('sizes every body with real model sizes, a Custom one too, and none with a size in another unit', async () => {
    const { design } = await load();
    const sizes = USED.map((_, index) => design.mvr?.fixtures[String(index + 1)]?.bodySize);
    expect(sizes).toEqual([0.5, 0.5, 0.5, 0.5, undefined, undefined, undefined, 0.5]);
  });

  it('writes one summary line per product and class; the counts add up to the fixture count', async () => {
    const { summary } = await load();
    const lines = summary.bodyLines;
    expect(lines.reduce((sum, line) => sum + line.count, 0)).toBe(summary.fixtureCount);
    expect(summary.fixtureCount).toBe(USED.length);
    expect(lines.map((line) => [line.product, line.bodyClass, line.count])).toEqual([
      ['Mover', 'mesh', 2],
      ['Symbol', 'meshVendorSymbol', 1],
      ['Posed', 'suspect', 1],
      ['Boxes', 'boxes', 1],
      ['Huge', 'suspect', 1],
      ['Stub', 'none', 1],
      ['Zenith@Gone', 'none', 1],
    ]);
    expect(lines[0]?.message).toBe('2 fixtures of "Mover": the GDTF model is shown.');
    expect(lines[2]?.message).toBe('1 fixture of "Posed": the GDTF model has a baked pose; boxes are shown.');
    expect(lines[6]?.message).toBe('1 fixture of "Zenith@Gone": there is no GDTF file; the desk body is shown.');
  });
});
