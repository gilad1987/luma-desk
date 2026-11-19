import { gdtfMode } from './gdtfMode';
import { makeBoxes3ds, type TestBox } from './makeBoxes3ds';
import { makeGdtf } from './makeGdtf';
import { makeMvr } from './makeMvr';
import { RIG_TYPES, rigGdtfFiles } from './renderRigGdtfs';
import { SCENERY_LAYERS_XML, SCENERY_SYMDEFS, sceneryFiles } from './accuracyScenery';
import { sceneXml } from './sceneXml';

type Vec = readonly [number, number, number];
type Axes = readonly [Vec, Vec, Vec];

// 15 decimals: cos 90° is 6e-17 in floating point; the file text is the truth both readers share, so the rounding
// only keeps the text tidy.
const num = (v: number): string => String(+v.toFixed(15));
const rad = (deg: number): number => (deg * Math.PI) / 180;
const rotX = (d: number): Axes => [
  [1, 0, 0],
  [0, Math.cos(rad(d)), Math.sin(rad(d))],
  [0, -Math.sin(rad(d)), Math.cos(rad(d))],
];
const rotY = (d: number): Axes => [
  [Math.cos(rad(d)), 0, -Math.sin(rad(d))],
  [0, 1, 0],
  [Math.sin(rad(d)), 0, Math.cos(rad(d))],
];
const rotZ = (d: number): Axes => [
  [Math.cos(rad(d)), Math.sin(rad(d)), 0],
  [-Math.sin(rad(d)), Math.cos(rad(d)), 0],
  [0, 0, 1],
];
const NONE = rotZ(0);
const matrix = (axes: Axes, o: Vec): string =>
  `<Matrix>${[...axes, o].map((v) => `{${v.map(num).join(',')}}`).join('')}</Matrix>`;

/** A fixture of `type` with FixtureID `id`, uuid `A-<id>`, patched 8 channels apart from 1. */
function fixture(type: keyof typeof RIG_TYPES, id: number, axes: Axes, o: Vec): string {
  const patch = `<Addresses><Address break="0">${(id - 201) * 8 + 1}</Address></Addresses>`;
  const body = `<GDTFSpec>${RIG_TYPES[type].spec}</GDTFSpec><GDTFMode>Std</GDTFMode><FixtureID>${id}</FixtureID>`;
  return `<Fixture uuid="A-${id}" name="Acc ${id}">${matrix(axes, o)}${body}${patch}</Fixture>`;
}
const group = (uuid: string, axes: Axes, o: Vec, children: string): string =>
  `<GroupObject uuid="${uuid}" name="${uuid}">${matrix(axes, o)}<ChildList>${children}</ChildList></GroupObject>`;

// Three nested groups, each rotated and moved, so every level of the composition counts.
const NESTED = group(
  'G1',
  rotZ(30),
  [1500, -2000, 0],
  fixture('wash', 201, NONE, [0, 0, 6000]) +
    group(
      'G2',
      rotZ(90),
      [0, 1000, 3000],
      fixture('spot', 202, rotX(20), [500, 0, 2000]) +
        group(
          'G3',
          rotX(15),
          [-800, 0, 1500],
          fixture('spot', 203, NONE, [0, 0, 0]) + fixture('bar', 204, rotZ(45), [1200, -300, 400]),
        ),
    ),
);
// standing on the floor, beam up; and side-mounted on the left, beam to stage left
const FLOOR = fixture('wash', 205, rotX(180), [2000, -5000, 0]);
const SIDE = fixture('spot', 206, rotY(90), [-6500, 0, 3000]);
const box = (min: Vec, max: Vec): TestBox => [min, max];
// A GDTF whose body is a real mesh reaching 100 mm above its origin, so the box top is not the point MVR places: a
// gate that read the box top for a GDTF body would be 100 mm off along the turned body axis.
const MESH_FIXTURE_UUID = 'A-207';
const MESH_GDTF = makeGdtf({
  name: 'Mesh Head',
  models: '<Model Name="Body" Length="0.3" Width="0.3" Height="0.4" File="body"/>',
  geometries: '<Geometry Name="Body" Model="Body"><Beam Name="Beam" BeamType="Spot" BeamAngle="20"/></Geometry>',
  modes: gdtfMode('Std', [['Dimmer', 'Offset="1"']]),
  files: { 'models/3ds/body.3ds': makeBoxes3ds([box([-150, -150, -300], [150, 150, 100])]) },
});
const MESH = `<Fixture uuid="${MESH_FIXTURE_UUID}" name="Acc 207">${matrix(rotX(30), [3000, 1000, 5000])}<GDTFSpec>Acme@MeshHead</GDTFSpec><GDTFMode>Std</GDTFMode><FixtureID>207</FixtureID><Addresses><Address break="0">49</Address></Addresses></Fixture>`;

const DECK = `<SceneObject uuid="DECK" name="Deck">${matrix(NONE, [0, 0, 0])}<Geometries><Geometry3D fileName="deck.3ds"/></Geometries></SceneObject>`;
export const ACCURACY_FIXTURES = 7;

/**
 * The accuracy stage: a deck, four fixtures in three nested, rotated and moved GroupObjects under a moved layer, one
 * fixture standing on the floor, one side-mounted and one tilted GDTF mesh body. Invented data; renderStageMvr stays
 * unchanged for its baselines.
 */
export function accuracyStageMvr(): Uint8Array {
  const children = `${DECK}${NESTED}${FLOOR}${SIDE}${MESH}`;
  const layer = `<Layer uuid="L-ACC" name="Accuracy">${matrix(NONE, [0, 500, 0])}<ChildList>${children}</ChildList></Layer>`;
  const deck = makeBoxes3ds([box([-6000, -4000, 0], [6000, 4000, 1200])]);
  const files = { ...rigGdtfFiles(), ...sceneryFiles(), 'Acme@MeshHead.gdtf': MESH_GDTF, 'deck.3ds': deck };
  return makeMvr(sceneXml(layer + SCENERY_LAYERS_XML, SCENERY_SYMDEFS), files);
}
