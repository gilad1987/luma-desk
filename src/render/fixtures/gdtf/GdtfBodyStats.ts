import type { FixtureBody } from '../../../mvr/import/fixtureBodies';

/** What the library draws from: `MvrImport.bodies` and `MvrImport.gdtfMeshes`. */
export interface GdtfBodyInput {
  readonly bodies: ReadonlyMap<string, FixtureBody>;
  /** Emptied by `load`: the parsed geometry replaces the bytes, so they are not held twice. */
  readonly gdtfMeshes: Map<string, Uint8Array>;
}

/**
 * Why the draw step put the desk model where the import planned the GDTF one, or could not fit it: a model file a part
 * needs cannot be read, the model has more triangles than one body may draw, the rig has drawn its triangle budget,
 * or the GDTF box is far from the shape of the desk model.
 */
export type NoteKind = 'unread' | 'dense' | 'budget' | 'limited';

/** The notes of one fixture: each kind with its count (the triangles for `dense` and `budget`, else 0). */
export type BodyNotes = ReadonlyMap<NoteKind, number>;

/**
 * How many fixtures took each step: the GDTF geometry from the file's own meshes (`mesh`) or from the default shapes
 * of the GDTF specification alone (`shapes`), the desk model fitted to the GDTF box, the desk model as is.
 */
export interface GdtfBodyStats {
  mesh: number;
  shapes: number;
  fitted: number;
  desk: number;
  /** Fixtures whose tree has axes the desk does not drive. */
  multiHead: number;
  /** Model files that did not parse, and default meshes of the specification that could not be loaded. */
  readonly failed: string[];
}
