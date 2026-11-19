import { makeBoxes3ds, type TestBox } from './makeBoxes3ds';

// Scenery of the accuracy stage, one object or symbol set per layer, so each drawn layer group's box is the box of
// what is under test. Turns are 90° so every matrix entry is exact; the composition is what is checked.
type Vec = readonly [number, number, number];
const at = ([x, y, z]: Vec): string => `<Matrix>{1,0,0}{0,1,0}{0,0,1}{${x},${y},${z}}</Matrix>`;
const rotZ90 = ([x, y, z]: Vec): string => `<Matrix>{0,1,0}{-1,0,0}{0,0,1}{${x},${y},${z}}</Matrix>`;
const rotX90 = ([x, y, z]: Vec): string => `<Matrix>{1,0,0}{0,0,1}{0,-1,0}{${x},${y},${z}}</Matrix>`;

/** The mesh files, in mm and local to their file; neither is centred on its origin, so a lost offset shows. */
export const SCENERY_MESHES: Readonly<Record<string, TestBox>> = {
  'plinth.3ds': [
    [-400, -300, 0],
    [400, 300, 900],
  ],
  'crate.3ds': [
    [-250, -150, -100],
    [250, 150, 350],
  ],
};
/** Layer uuids: an object in a turned, moved GroupObject; a nested Symbol placed twice (instanced) and once (merged). */
export const SCENERY_LAYERS = { grouped: 'L-SA', instanced: 'L-SB', merged: 'L-SC' } as const;

const geometry = (inner: string): string => `<Geometries>${inner}</Geometries>`;
const object = (uuid: string, matrix: string, inner: string): string =>
  `<SceneObject uuid="${uuid}" name="Object ${uuid}">${matrix}${geometry(inner)}</SceneObject>`;
const outer = (uuid: string): string => `<Symbol uuid="${uuid}" symdef="SD-OUTER"/>`;
const layer = (uuid: string, name: string, inner: string): string =>
  `<Layer uuid="${uuid}" name="${name}"><ChildList>${inner}</ChildList></Layer>`;

/** The crate sits 100 mm up in the inner Symdef, which the outer one turns about X and moves along X. */
export const SCENERY_SYMDEFS =
  `<Symdef uuid="SD-INNER" name="Inner"><ChildList><Geometry3D fileName="crate.3ds">${at([0, 0, 100])}</Geometry3D></ChildList></Symdef>` +
  `<Symdef uuid="SD-OUTER" name="Outer"><ChildList><Symbol uuid="SY-IN" symdef="SD-INNER">${rotX90([300, 0, 0])}</Symbol></ChildList></Symdef>`;

const PLINTH = object('S-A', at([500, 200, 0]), '<Geometry3D fileName="plinth.3ds"/>');
export const SCENERY_LAYERS_XML =
  layer(
    SCENERY_LAYERS.grouped,
    'Layer A',
    `<GroupObject uuid="G-SA" name="Group A">${rotZ90([2000, -1500, 300])}<ChildList>${PLINTH}</ChildList></GroupObject>`,
  ) +
  layer(
    SCENERY_LAYERS.instanced,
    'Layer B',
    object('S-B1', at([-3000, 2000, 0]), outer('SY-B1')) + object('S-B2', rotZ90([-1500, 2500, 0]), outer('SY-B2')),
  ) +
  layer(SCENERY_LAYERS.merged, 'Layer C', object('S-C', at([4000, 2500, 0]), outer('SY-C')));

/** The archive entries of the two mesh files. */
export const sceneryFiles = (): Record<string, Uint8Array> =>
  Object.fromEntries(Object.entries(SCENERY_MESHES).map(([file, box]) => [file, makeBoxes3ds([box])]));
