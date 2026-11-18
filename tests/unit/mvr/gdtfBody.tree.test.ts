// @vitest-environment jsdom
/**
 * The geometry tree a GDTF read gives per DMX mode: the parts, their models with the mesh file in the archive, the
 * pan and tilt parts from the channel links, and the beam data. All products are invented.
 */
import { describe, expect, it } from 'vitest';
import { readGdtf } from '../../../src/mvr/gdtf/readGdtf.ts';
import { gdtfMode, makeGdtf } from '../../shared/index.ts';

/** A GDTF position matrix that only moves on Z: rows in braces, the translation in the 4th column, metres. */
const down = (z: number): string => `{1,0,0,0}{0,1,0,0}{0,0,1,${z}}{0,0,0,1}`;
const MODELS =
  '<Model Name="Base" Length="0.3" Width="0.2" Height="0.1" File="base" PrimitiveType="Base"/>' +
  '<Model Name="Yoke" Length="0.3" Width="0.1" Height="0.3" File="yoke"/>' +
  '<Model Name="Head" Length="0.2" Width="0.2" Height="0.25" File="head"/>';
const LENS =
  `<Beam Name="Lens" Position="${down(-0.12)}" BeamType="Spot" BeamAngle="12" FieldAngle="14" BeamRadius="0.08" ` +
  'LuminousFlux="20000"/>';
const GEOMETRIES =
  `<Geometry Name="Base" Model="Base"><Axis Name="Yoke" Model="Yoke" Position="${down(-0.1)}">` +
  `<Axis Name="Head" Model="Head" Position="${down(-0.2)}">${LENS}` +
  '<Laser Name="Pointer"><Protocol Name="Any"/></Laser></Axis></Axis></Geometry>';
const MOVING = [
  ['Dimmer', 'Offset="1" Geometry="Lens"'],
  ['Pan', 'Offset="2" Geometry="Yoke"'],
  ['Tilt', 'Offset="3" Geometry="Head"'],
] as const;
const MODES =
  gdtfMode('Std', MOVING, 'Base') +
  gdtfMode('Ext', [...MOVING, ['Zoom', 'Offset="4" Geometry="Lens"']], 'Base') +
  gdtfMode('Fixed', [['Dimmer', 'Offset="1" Geometry="Lens"']], 'Base') +
  gdtfMode('Lost', [['Dimmer', 'Offset="1"']], 'Nowhere');
const FILES = {
  'models/gltf/head.glb': 'glb',
  'models/3ds/head.3ds': 'twin',
  'models/3DS/Yoke.3DS': 'yoke',
  'models/gltf_low/head.glb': 'low',
};
const read = () => readGdtf(makeGdtf({ models: MODELS, geometries: GEOMETRIES, modes: MODES, files: FILES }), 'M.gdtf');

describe('the GDTF geometry tree of a mode', () => {
  it('gives the pan and tilt parts from the Pan and Tilt channel links', () => {
    const [std, ext, fixed, lost] = read().info?.bodies ?? [];
    const yoke = std?.root?.children[0];
    expect([std?.root?.name, std?.root?.type, std?.root?.role]).toEqual(['Base', 'Geometry', 'fixed']);
    expect([yoke?.name, yoke?.type, yoke?.role]).toEqual(['Yoke', 'Axis', 'pan']);
    expect(yoke?.children[0]?.role).toBe('tilt');
    expect(yoke?.position[14]).toBe(-0.1);
    // the same geometry and axes share one tree; a mode without the links has its own, with no moving part
    expect(ext?.root).toBe(std?.root);
    expect(fixed?.root?.children[0]?.role).toBe('fixed');
    expect(lost).toEqual({ mode: 'Lost', geometry: 'Nowhere' });
  });

  it('reads the beam data and the path to the beam origin', () => {
    const [std] = read().info?.bodies ?? [];
    const lens = std?.root?.children[0]?.children[0]?.children[0];
    expect(std?.beamPath).toEqual([0, 0, 0]);
    expect(lens?.beam).toEqual({
      beamType: 'Spot',
      beamAngle: 12,
      fieldAngle: 14,
      beamRadius: 0.08,
      luminousFlux: 20000,
    });
    expect(lens?.position[14]).toBe(-0.12);
  });

  it('keeps a geometry type it does not know as "other", without the data children of that type', () => {
    const head = read().info?.bodies[0]?.root?.children[0]?.children[0];
    expect(head?.children.map((part) => [part.name, part.type, part.tag, part.children.length])).toEqual([
      ['Lens', 'Beam', 'Beam', 0],
      ['Pointer', 'other', 'Laser', 0],
    ]);
  });

  it('finds the mesh file of each model: the GLB before the 3DS, any case, and notes the detail folders', () => {
    const root = read().info?.bodies[0]?.root;
    const yoke = root?.children[0];
    expect(root?.model).toEqual({
      name: 'Base',
      file: 'base',
      details: [],
      size: [0.3, 0.2, 0.1],
      primitiveType: 'Base',
    });
    expect([yoke?.model?.path, yoke?.model?.format]).toEqual(['models/3DS/Yoke.3DS', '3ds']);
    expect(yoke?.children[0]?.model).toMatchObject({
      path: 'models/gltf/head.glb',
      format: 'glb',
      details: ['gltf_low'],
      primitiveType: 'Undefined',
    });
  });
});
