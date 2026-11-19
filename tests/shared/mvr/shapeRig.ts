import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { importMvr, type MvrImport } from '../../../src/mvr/index.ts';
import { gdtfMode } from './gdtfMode';
import { makeGdtf } from './makeGdtf';
import { makeMvr } from './makeMvr';
import { sceneXml } from './sceneXml';

type Size = readonly [number, number, number];

/** `Length`, `Width`, `Height` of the three parts of `shapeMover`, in metres. */
export const MOVER_SIZES = { base: [0.4, 0.3, 0.1], yoke: [0.36, 0.12, 0.3], head: [0.24, 0.24, 0.32] } as const;

/** GDTF Z of the yoke origin under the base, of the head origin under the yoke and of the beam origin under the head. */
export const MOVER_DROPS = { yoke: -0.2, head: -0.1, beam: -0.16 } as const;

const at = (z: number): string => `Position="{1,0,0,0}{0,1,0,0}{0,0,1,${z}}{0,0,0,1}"`;
const model = (name: string, [length, width, height]: Size, primitive: string): string =>
  `<Model Name="${name}" Length="${length}" Width="${width}" Height="${height}" PrimitiveType="${primitive}"/>`;

/**
 * A `.gdtf` of a classic mover that has no mesh file: base, yoke (pan) and head (tilt) name GDTF primitives, a pigtail
 * hangs on the base and the beam leaves the head. `base` is the primitive of the base (`Base` or `Base1_1`).
 */
export function shapeMover(name: string, base = 'Base'): Uint8Array {
  const models =
    model('Base', MOVER_SIZES.base, base) +
    model('Yoke', MOVER_SIZES.yoke, 'Yoke') +
    model('Head', MOVER_SIZES.head, 'Head') +
    model('Tail', [0.9, 0.9, 0.9], 'Pigtail');
  const geometries =
    '<Geometry Name="Base" Model="Base"><Geometry Name="Tail" Model="Tail"/>' +
    `<Axis Name="Yoke" Model="Yoke" ${at(MOVER_DROPS.yoke)}><Axis Name="Head" Model="Head" ${at(MOVER_DROPS.head)}>` +
    `<Beam Name="Beam" BeamType="Spot" BeamRadius="0.05" ${at(MOVER_DROPS.beam)}/></Axis></Axis></Geometry>`;
  const channels = [
    ['Dimmer', 'Offset="1"'],
    ['Pan', 'Offset="2" Geometry="Yoke"'],
    ['Tilt', 'Offset="3" Geometry="Head"'],
  ] as const;
  return makeGdtf({ name, models, geometries, modes: gdtfMode('Std', channels, 'Base') });
}

/** A `.gdtf` of a static unit: one part with the given `<Model>` attributes after its name, and a beam. */
export function shapeStatic(name: string, attributes: string, files: Record<string, Uint8Array> = {}): Uint8Array {
  const models = `<Model Name="Body" ${attributes}/>`;
  const geometries =
    '<Geometry Name="Body" Model="Body"><Beam Name="Beam" BeamType="Wash" BeamRadius="0.04"/></Geometry>';
  return makeGdtf({ name, models, geometries, modes: gdtfMode('Std', [['Dimmer', 'Offset="1"']]), files });
}

/** Imports an MVR with one fixture per spec (`Acme@Name`), uuid `U-<index>`, and the given GDTF files. */
export function importShapeRig(files: Record<string, Uint8Array>, specs: readonly string[]): Promise<MvrImport> {
  const fixture = (spec: string, index: number): string =>
    `<Fixture uuid="U-${index}" name="Light ${index}"><Matrix>{1,0,0}{0,1,0}{0,0,1}{${index * 1000},0,5000}</Matrix>` +
    `<GDTFSpec>${spec}</GDTFSpec><GDTFMode>Std</GDTFMode><FixtureID>${index + 1}</FixtureID></Fixture>`;
  const scene = sceneXml(`<Layer uuid="L1" name="Rig"><ChildList>${specs.map(fixture).join('')}</ChildList></Layer>`);
  return importMvr(makeMvr(scene, files), { name: 'Shapes.mvr' });
}

/** The folder of the default meshes of the GDTF specification that the app ships. */
export const DEFAULT_MESH_DIR = join(process.cwd(), 'public', 'gdtf-meshes');

/** A default mesh as the app ships it: the source a test gives the body library in place of the page's `fetch`. */
export function shippedDefaultMesh(file: string): Promise<Uint8Array> {
  return Promise.resolve(new Uint8Array(readFileSync(join(DEFAULT_MESH_DIR, file))));
}
