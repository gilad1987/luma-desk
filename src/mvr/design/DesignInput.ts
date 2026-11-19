import type { FixtureTypeId } from '../../domain/FixtureType';
import type { Aabb } from '../math/Aabb';
import type { MvrFixtureRecord, MvrScene } from '../scene/MvrScene';
import type { FixedFit } from './fitScene';

/**
 * A scene fixture after the GDTF and patch steps: what the design step needs to make a desk fixture. Every MVR
 * `<Fixture>` element gives one, also a device that is no light, so none loses its id or patch.
 */
export interface ResolvedFixture {
  readonly record: MvrFixtureRecord;
  readonly type: FixtureTypeId;
  /** The GDTF type name, kept even when the GDTF file is missing. */
  readonly gdtfName: string;
  /** The GDTF mode name the patch applies to. */
  readonly mode: string;
  /** The channels the patched break of `mode` takes, when the GDTF file was read (see `MvrFixtureInfo.footprint`). */
  readonly footprint?: number;
  /** Set when the GDTF did not type the fixture as a light (`FixtureClass.standIn`); stored with the design. */
  readonly standIn?: 'placeholder' | 'device';
  /** The first DMX break decoded; absent when the fixture is not patched. */
  readonly patch?: { readonly universe: number; readonly address: number };
}

/** Everything `toStageDesign` reads, gathered by the import so the design step does no I/O and is easy to test. */
export interface DesignInput {
  /** The design name the UI shows, usually the file name. */
  readonly name: string;
  /** SHA-256 of the original MVR bytes, the IndexedDB key of the source file. */
  readonly fileHash?: string;
  readonly scene: MvrScene;
  /** Resolved fixtures in scene file order. */
  readonly fixtures: readonly ResolvedFixture[];
  /** Local mesh bounds (MVR frame) by mesh file name; a file without an entry has no usable geometry. */
  readonly meshBoxes: ReadonlyMap<string, Aabb>;
  /** The fit a luma export states; absent for other files, which are fitted on the stage. */
  readonly fixed?: FixedFit;
}
