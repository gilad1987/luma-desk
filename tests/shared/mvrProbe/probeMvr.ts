import { strFromU8, unzipSync } from 'fflate';
import { compose, IDENTITY, parseMatrix, type Affine, type Vec3 } from './affine';
import { childOf, parseXml, type XmlNode } from './xml';

/** A `<Fixture>` where the file puts it: world position (mm) and world axes, Z up. */
export interface ProbeFixture {
  uuid: string;
  position: Vec3;
  matrix: Affine;
}

/** One `<Geometry3D>` as placed in the world, with the uuid of the scene object that owns it. */
export interface ProbeMesh {
  owner: string;
  /** Uuid of the `<Layer>` the owner sits in. */
  layer: string;
  fileName: string;
  matrix: Affine;
}

export interface MvrProbe {
  fixtures: ProbeFixture[];
  meshes: ProbeMesh[];
}

// a Symdef that reaches itself would loop for ever; real files nest a few levels at most
const MAX_SYMBOL_DEPTH = 32;

/** An element's own `<Matrix>`, or identity when it has none, as the spec defaults it. */
function local(node: XmlNode): Affine {
  const text = childOf(node, 'Matrix')?.text;
  if (text === undefined) return IDENTITY;
  const matrix = parseMatrix(text);
  if (!matrix) throw new Error(`bad <Matrix> on ${node.tag} ${node.attrs['uuid'] ?? ''}: ${text}`);
  return matrix;
}

type Symdefs = ReadonlyMap<string, XmlNode>;
/** What a walk carries down: the Symdefs by uuid, the lists it fills and how deep in symbols it is. */
interface Walk {
  symdefs: Symdefs;
  out: MvrProbe;
  depth: number;
  layer: string;
}

/** Geometry3D and Symbol children of a `<Geometries>` or a Symdef's `<ChildList>`, placed under `world`. */
function placeGeometry(list: XmlNode, world: Affine, owner: string, run: Walk): void {
  const { symdefs, out, depth, layer } = run;
  if (depth > MAX_SYMBOL_DEPTH) throw new Error(`symbols nest deeper than ${MAX_SYMBOL_DEPTH} under ${owner}`);
  for (const node of list.children) {
    const placed = compose(world, local(node));
    const fileName = node.attrs['fileName'] ?? '';
    if (node.tag === 'Geometry3D') out.meshes.push({ owner, layer, fileName, matrix: placed });
    if (node.tag !== 'Symbol') continue;
    const symdef = symdefs.get(node.attrs['symdef'] ?? '');
    const children = symdef && childOf(symdef, 'ChildList');
    if (children) placeGeometry(children, placed, owner, { ...run, depth: depth + 1 });
  }
}

/** Every scene object of a `<ChildList>`: fixtures are recorded, geometry is placed, nested lists are walked. */
function walk(list: XmlNode, parent: Affine, run: Walk): void {
  for (const node of list.children) {
    if (node.tag === 'Matrix') continue;
    const world = compose(parent, local(node));
    const uuid = node.attrs['uuid'] ?? '';
    if (node.tag === 'Fixture') run.out.fixtures.push({ uuid, position: world.o, matrix: world });
    const geometries = childOf(node, 'Geometries');
    if (geometries) placeGeometry(geometries, world, uuid, run);
    const children = childOf(node, 'ChildList');
    if (children) walk(children, world, run);
  }
}

/** Reads a `GeneralSceneDescription.xml` text: Layer → GroupObject → object → Symbol → Symdef → Geometry3D. */
export function probeScene(xml: string): MvrProbe {
  const scene = childOf(childOf(parseXml(xml), 'GeneralSceneDescription') ?? parseXml(''), 'Scene');
  if (!scene) throw new Error('no <GeneralSceneDescription><Scene>');
  const symdefs = new Map<string, XmlNode>();
  for (const node of childOf(scene, 'AUXData')?.children ?? []) {
    if (node.tag === 'Symdef') symdefs.set(node.attrs['uuid'] ?? '', node);
  }
  const out: MvrProbe = { fixtures: [], meshes: [] };
  for (const layer of childOf(scene, 'Layers')?.children ?? []) {
    const children = childOf(layer, 'ChildList');
    const uuid = layer.attrs['uuid'] ?? '';
    if (layer.tag === 'Layer' && children) walk(children, local(layer), { symdefs, out, depth: 0, layer: uuid });
  }
  return out;
}

/** Reads the scene of a `.mvr` archive's bytes. */
export function probeMvr(mvr: Uint8Array): MvrProbe {
  const entry = unzipSync(mvr, { filter: (f) => f.name === 'GeneralSceneDescription.xml' })[
    'GeneralSceneDescription.xml'
  ];
  if (!entry) throw new Error('archive has no GeneralSceneDescription.xml');
  return probeScene(strFromU8(entry));
}
