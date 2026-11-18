import type { Mat4 } from '../math/Mat4';

/** The geometry types the importer knows by name; every other GDTF geometry type stays in the tree as `other`. */
export type GdtfNodeType = 'Geometry' | 'Axis' | 'Beam' | 'Display' | 'GeometryReference' | 'other';

/** How a part moves: `pan` and `tilt` are the `Axis` parts that the mode's Pan and Tilt channels link to. */
export type GdtfNodeRole = 'fixed' | 'pan' | 'tilt';

/** One GDTF `Model`: the size of a part and the mesh file that draws it. */
export interface GdtfModel {
  readonly name: string;
  /** The `File` attribute as written: a name without folder and extension; `''` when the model names no file. */
  readonly file: string;
  /** The mesh entry inside the GDTF archive (`models/gltf/Head.glb`); absent when the archive holds no such file. */
  readonly path?: string;
  /** The format of `path`. GDTF prefers glTF, so a GLB wins when the archive holds both formats. */
  readonly format?: 'glb' | '3ds';
  /** The optional detail folders that hold this file too (`gltf_low`, `3ds_high`); the importer does not read them. */
  readonly details: readonly string[];
  /** `Length`, `Width`, `Height`: metres on X, Y and Z. GDTF: the mesh is scaled to this size. 0 when not set. */
  readonly size: readonly [number, number, number];
  /** `PrimitiveType` as written (`Cube`, `Head`, `Base1_1`); the GDTF default is `Undefined`. */
  readonly primitiveType: string;
}

/** The light output of a `Beam` geometry, with the GDTF default for every attribute the file leaves out. */
export interface GdtfBeamData {
  readonly beamType: string;
  /** Degrees, the full angle. */
  readonly beamAngle: number;
  /** Degrees, the full angle. */
  readonly fieldAngle: number;
  /** Metres: the radius of the beam where it starts. */
  readonly beamRadius: number;
  /** Lumen, for all emitters the geometry stands for. */
  readonly luminousFlux: number;
}

/**
 * One part of a fixture body. GDTF: the device hangs, Z is up, pan turns about Z and tilt about X, and the mesh of
 * each part is drawn around the origin of the part (its suspension point).
 */
export interface GdtfNode {
  readonly name: string;
  readonly type: GdtfNodeType;
  /** The XML node name as written (`FilterColor`, `Laser`), so a part of type `other` still says what it is. */
  readonly tag: string;
  /** The `Position` relative to the parent part, in metres, as a column-major `Mat4`; the identity when not set. */
  readonly position: Mat4;
  /** The model of the part; a `GeometryReference` without its own takes the model of the geometry it names. */
  readonly model?: GdtfModel;
  readonly role: GdtfNodeRole;
  /** On a `Beam` and on a reference to one. The origin of the part is the beam origin; it emits toward its -Z. */
  readonly beam?: GdtfBeamData;
  /** On a `GeometryReference`: the top-level geometry it names, whose children are copied under this part. */
  readonly target?: string;
  /**
   * Why the part has no children though the file may give it some: the reference names no geometry of the file
   * (`missing`), names one it is already inside (`loop`), or the tree is deeper or larger than the reader allows.
   */
  readonly broken?: 'missing' | 'loop' | 'limit';
  readonly children: readonly GdtfNode[];
}

/**
 * The body of one DMX mode: the geometry tree under the mode's root geometry, with every `GeometryReference`
 * expanded. It is plain data, so a later step can build the 3D parts from it without the XML.
 */
export interface GdtfBody {
  /** The DMX mode name; `GdtfInfo.bodies` holds one body per mode, in the order of `GdtfInfo.modes`. */
  readonly mode: string;
  /** The top-level geometry the mode names. */
  readonly geometry: string;
  /** Absent when the mode names no top-level geometry of the file. Modes with the same tree and axes share one. */
  readonly root?: GdtfNode;
  /** Child indexes from `root` to the first part with `beam`, the beam origin; `[]` is the root. Absent without one. */
  readonly beamPath?: readonly number[];
}
