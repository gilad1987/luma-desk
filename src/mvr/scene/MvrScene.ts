import type { Mat4 } from '../math/Mat4';
import type { MvrWarning } from '../MvrWarning';

/**
 * One mesh file drawn at one place: a scene object, truss or symbol instance reduced to "this file, this transform".
 * Symbols are already expanded, so render instances placements without knowing MVR's object tree.
 */
export interface MeshPlacement {
  /** Root-level archive file name of the mesh (3DS or GLB), as the scene's `<Geometry3D fileName>` names it. */
  readonly file: string;
  /** Mesh to world: MVR frame, millimetres, Z up, with every parent and symbol matrix already applied. */
  readonly matrix: Mat4;
  /** Uuid of the `<Layer>` the owning object sits in, so the UI can show or hide layers. */
  readonly layer: string;
  /** The owning element's tag, for example `SceneObject`, `Truss` or `Symbol`, so render can style kinds apart. */
  readonly kind: string;
  /** The owning object's `name`, empty when it has none; render reads it to tell an LED wall drawn as scenery. */
  readonly name: string;
  /** The name of the `<Layer>`, which often is the only place a plot says a plain object is an LED wall. */
  readonly layerName: string;
  /** The name of the innermost `<Symdef>` the mesh came from; absent for a mesh the object holds itself. */
  readonly symdef?: string;
  /** Uuid of the owning object; several placements share it when one object has several meshes. */
  readonly uuid: string;
}

/** One `<Address>` of a fixture, kept raw: the value is an absolute number or `universe.address` text. */
export interface MvrAddress {
  /** The `break` attribute: which DMX break of the GDTF mode this address patches (0 when absent). */
  readonly dmxBreak: number;
  /** The raw text of `<Address>`; the patch step decodes it. */
  readonly value: string;
}

/** A `<Fixture>` as the scene states it, before GDTF lookup and design mapping turn it into a desk fixture. */
export interface MvrFixtureRecord {
  readonly uuid: string;
  readonly name: string;
  /** `<FixtureID>`: free text the user typed, may be empty. */
  readonly fixtureId: string;
  /** `<FixtureIDNumeric>` when present and numeric; the preferred desk fixture id. */
  readonly fixtureIdNumeric?: number;
  /** `<GDTFSpec>`: the GDTF file name, often without `.gdtf` or with other case; the GDTF step resolves it. */
  readonly gdtfSpec: string;
  /** `<GDTFMode>`: the DMX mode name inside the GDTF. */
  readonly gdtfMode: string;
  /** Addresses in file order; empty when the fixture is not patched. */
  readonly addresses: readonly MvrAddress[];
  /** Uuid of the `<FocusPoint>` the fixture aims at, when the scene gives one. */
  readonly focus?: string;
  /** Uuid of the `<Layer>` the fixture sits in. */
  readonly layer: string;
  /** Fixture to world: MVR frame, millimetres, Z up, with every parent matrix already applied. */
  readonly matrix: Mat4;
}

/** A `<Layer>` of the scene, listed so the UI can name layers that placements and fixtures refer to by uuid. */
export interface MvrLayerInfo {
  readonly uuid: string;
  readonly name: string;
}

/**
 * Everything the scene walk reads from `GeneralSceneDescription.xml`: plain data in the MVR frame, with no GDTF or
 * desk mapping yet, so each later step can be tested on its own.
 */
export interface MvrScene {
  readonly layers: readonly MvrLayerInfo[];
  /** Fixtures in file order, which is the order fixture ids are assigned in. */
  readonly fixtures: readonly MvrFixtureRecord[];
  readonly placements: readonly MeshPlacement[];
  /** `<FocusPoint>` world matrices by uuid, so a fixture's `focus` resolves to a point to aim at. */
  readonly focusPoints: ReadonlyMap<string, Mat4>;
  /** Problems the walk survived, in the order it met them. */
  readonly warnings: readonly MvrWarning[];
}
