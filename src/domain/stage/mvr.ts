import type { FixtureTypeId } from '../FixtureType';
import type { Vec3 } from './types';

/**
 * What an imported fixture was in the MVR file. The desk fixture keeps only desk data, so the import keeps these
 * MVR names here to show them in the Sheet and to match a fixture again on a later import.
 */
export interface MvrFixtureInfo {
  /** The `<Fixture uuid>`: stable across exports of the same file, unlike the desk id. */
  readonly uuid: string;
  /** Uuid of the `<Layer>` the fixture sits in, so a layer can be hidden as a whole. */
  readonly layer: string;
  /** The GDTF fixture type name, kept even when the GDTF file is missing so the user sees what was meant. */
  readonly gdtfName: string;
  /**
   * The GDTF DMX mode the file named, even for an unpatched fixture, so a re-export names the mode that belongs to
   * `gdtfName` and not the desk type's own mode.
   */
  readonly gdtfMode: string;
  /**
   * The desk type the fixture has after the import, the luma data's type for a desk export. The export names
   * `gdtfName` and `gdtfMode` only while the fixture still has this type: after the user changes the type, the
   * imported GDTF no longer describes it.
   */
  readonly type: FixtureTypeId;
  /**
   * The DMX channels the patched break takes, read from the GDTF mode, when the GDTF file was in the archive. The
   * export measures patch overlaps and auto-patch steps with it, because the desk type's own layout is only a guess
   * for another product. Absent when unknown; 1 to 512, as one break lies in one universe.
   */
  readonly footprint?: number;
  /**
   * The product's overall size in metres: the largest dimension of its GDTF geometry, when the file had a GDTF the
   * import trusts for it. The desk draws the fixture's model at this size (`bodyScale`); absent, at the type's own.
   */
  readonly bodySize?: number;
  /** The `<FocusPoint>` the fixture aims at, in world metres after the fit offset, when the file gives one. */
  readonly focus?: Vec3;
}

/** A `<Layer>` of the MVR scene, listed so the UI can name and toggle layers that fixtures refer to by uuid. */
export interface MvrLayer {
  readonly uuid: string;
  readonly name: string;
}

/**
 * The MVR facts of an imported design (contract G4). Plain JSON data, because it is saved in the show file and the
 * domain must not import the `mvr` layer that produced it.
 */
export interface MvrDesignInfo {
  /** Per fixture, keyed by the desk fixture id as a string, because JSON object keys are strings. */
  readonly fixtures: Readonly<Record<string, MvrFixtureInfo>>;
  readonly layers: readonly MvrLayer[];
  /** Uuids of the layers the user hid; hidden fixtures and meshes are not drawn. */
  readonly hiddenLayers: readonly string[];
  /**
   * The auto-fit offset: world metres added to every converted MVR point to fit the file on the stage. Kept so the
   * imported meshes, which stay in the MVR frame, can be moved by exactly the same amount as the fixtures, and so an
   * export can take it off again and write the points where the source file had them (contract G4, Amendment 3).
   */
  readonly offset: Vec3;
}
