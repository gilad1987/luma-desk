import { makeBoxes3ds, type TestBox } from './makeBoxes3ds';
import { makeMvr } from './makeMvr';
import { RIG_TYPES, rigGdtfFiles } from './renderRigGdtfs';
import { sceneXml } from './sceneXml';

/** Fixture ids of the render rig by type: 16 spots on the truss, 12 washes on the towers, 12 bars on the deck. */
export const RENDER_RIG_IDS = { spot: [101, 116], wash: [117, 128], bar: [129, 140] } as const;
export const RENDER_RIG_FIXTURES = 40;

const at = (x: number, y: number, z: number): string => `<Matrix>{1,0,0}{0,1,0}{0,0,1}{${x},${y},${z}}</Matrix>`;
const mesh = (file: string): string => `<Geometries><Geometry3D fileName="${file}"/></Geometries>`;
/** One placed object: tag (`SceneObject`, `Truss`, `Support`), uuid, name, position in mm and inner geometry. */
type Vec = readonly [number, number, number];
const object = (tag: string, [uuid, name]: readonly [string, string], [x, y, z]: Vec, geometry: string): string =>
  `<${tag} uuid="${uuid}" name="${name}">${at(x, y, z)}${geometry}</${tag}>`;

/** Mesh files in mm, local to their object: deck, back wall, tower, truss and a standing figure of five boxes. */
const box = ([x, y, z]: Vec, [dx, dy, dz]: Vec): TestBox => [
  [x, y, z],
  [x + dx, y + dy, z + dz],
];
const FIGURE = [
  box([-200, -100, 0], [400, 200, 900]),
  box([-250, -120, 900], [500, 240, 600]),
  box([-110, -110, 1500], [220, 220, 250]),
  box([-400, -60, 950], [150, 120, 500]),
  box([250, -60, 950], [150, 120, 500]),
];
export const MESHES = {
  'deck.3ds': makeBoxes3ds([box([-6000, -4000, 0], [12000, 8000, 1200])]),
  'wall.3ds': makeBoxes3ds([box([-7000, 0, 0], [14000, 200, 7000])]),
  'tower.3ds': makeBoxes3ds([box([-250, -250, 0], [500, 500, 8500])]),
  'truss.3ds': makeBoxes3ds([box([-7000, -200, -200], [14000, 400, 400])]),
  'figure.3ds': makeBoxes3ds(FIGURE),
};

/** One fixture of `type` at `id`, patched 8 channels apart from 1 so the 40 fit one universe. */
export function fixture(type: keyof typeof RIG_TYPES, id: number, position: Vec): string {
  const patch = `<Addresses><Address break="0">${(id - 101) * 8 + 1}</Address></Addresses>`;
  const body = `<GDTFSpec>${RIG_TYPES[type].spec}</GDTFSpec><GDTFMode>Std</GDTFMode><FixtureID>${id}</FixtureID>`;
  return object('Fixture', [`F-${id}`, `${RIG_TYPES[type].name} ${id}`], position, body + patch);
}

const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i);
const FIXTURES = [
  ...range(16).map((i) => fixture('spot', 101 + i, [-6000 + i * 800, -3000, 7200])),
  ...range(12).map((i) => fixture('wash', 117 + i, [i < 6 ? -6500 : 6500, -3500, 2500 + (i % 6) * 900])),
  ...range(12).map((i) => fixture('bar', 129 + i, [-5500 + i * 1000, -3800, 1200])),
];

/** Seat rows and LED panels on Symdefs with no geometry, as CAD writers leave them; they place nothing. */
const SYMDEFS =
  '<Symdef uuid="SD-SEAT" name="Seat Block"/><Symdef uuid="SD-PANEL" name="Tile Grid"><ChildList/></Symdef>';
const symbol = (uuid: string, name: string, symdef: string, position: Vec): string =>
  object(
    'SceneObject',
    [uuid, name],
    position,
    `<Geometries><Symbol uuid="${uuid}-S" symdef="${symdef}"/></Geometries>`,
  );
const SYMBOLS = [
  ...range(4).map((i) => symbol(`SEAT-${i}`, `Seat Row ${i + 1}`, 'SD-SEAT', [0, -14000 - i * 1200, 0])),
  ...range(2).map((i) => symbol(`PANEL-${i}`, `LED Panel ${i + 1}`, 'SD-PANEL', [i ? 4500 : -4500, 3500, 1200])),
];

export const STAGE = [
  object('SceneObject', ['DECK', 'Stage Deck'], [0, 0, 0], mesh('deck.3ds')),
  object('SceneObject', ['WALL', 'Backdrop Wall'], [0, 3800, 1200], mesh('wall.3ds')),
  object('Support', ['TOWER-L', 'Tower Left'], [-6500, -3500, 0], mesh('tower.3ds')),
  object('Support', ['TOWER-R', 'Tower Right'], [6500, -3500, 0], mesh('tower.3ds')),
  object('Truss', ['TRUSS', 'Front Truss'], [0, -3000, 7600], mesh('truss.3ds')),
  ...[-3000, -1000, 1000, 3000].map((x, i) =>
    object('SceneObject', [`BAND-${i}`, `Band ${i + 1}`], [x, 0, 1200], mesh('figure.3ds')),
  ),
];

export const layer = (uuid: string, name: string, children: readonly string[]): string =>
  `<Layer uuid="${uuid}" name="${name}"><ChildList>${children.join('')}</ChildList></Layer>`;

/**
 * A deterministic show-sized `.mvr` for render measurements: deck, back wall, two towers, a truss, 40 fixtures of
 * three types, four band figures and empty-Symdef seats and panels. All names are invented, so it can be committed.
 */
export function renderStageMvr(): Uint8Array {
  const layers = layer('L-STAGE', 'Stage', [...STAGE, ...SYMBOLS]) + layer('L-RIG', 'Rig', FIXTURES);
  return makeMvr(sceneXml(layers, SYMDEFS), { ...rigGdtfFiles(), ...MESHES });
}
