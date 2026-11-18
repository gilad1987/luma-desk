import type { StageDesign } from '../domain/stage/StageDesign';
import type { StageBounds, SurfaceBox, Vec3 } from '../domain/stage/types';
import type { LayerBox } from './design/layerBoxes';
import type { BodyLine } from './import/bodyWarnings';
import type { FixtureBody } from './import/fixtureBodies';
import type { MeshPlacement } from './scene/MvrScene';
import type { MvrWarning } from './MvrWarning';

/**
 * The imported scenery that the design does not hold: the render step draws the meshes, beams land on the surfaces
 * and the camera fits the bounds. Meshes stay in the MVR frame; render applies the axis change and `offset`.
 */
export interface MvrGeometry {
  /** Mesh placements in the MVR world frame (millimetres, Z up). */
  readonly placements: readonly MeshPlacement[];
  /** World metres added after the axis change to fit the file on the stage; the same as `design.mvr.offset`. */
  readonly offset: Vec3;
  /** The box around fixtures, meshes and the deck in the fitted world frame, for the camera fit. */
  readonly bounds: StageBounds;
  /** Top faces of the placed meshes in the fitted world frame, where beams land. */
  readonly surfaces: readonly SurfaceBox[];
  /** One mesh box per layer in the fitted world frame, so `stageBox` can be recomputed when the user toggles layers. */
  readonly layers: readonly LayerBox[];
  /** Uuids of the layers the import judged the venue hall; `stageBox` leaves them out even when they are shown. */
  readonly hallLayers: readonly string[];
}

/** The counts the import summary shows, so the user sees at once what came in and what is missing. */
export interface MvrSummary {
  /** Light fixtures that became desk fixtures. */
  readonly fixtureCount: number;
  /** Fixtures without a DMX patch. */
  readonly unpatchedCount: number;
  /** Fixtures whose GDTF file was not found, so their type is a guess. */
  readonly missingGdtfCount: number;
  /** Scene objects that are not light fixtures, for example trusses, speakers and set pieces. */
  readonly objectCount: number;
  /** Mesh placements after symbol expansion. */
  readonly placementCount: number;
  readonly layerCount: number;
  /** True when no mesh could be read, so the stage shows fixtures only. */
  readonly noGeometry: boolean;
  /** How the fixtures get their body: one line per product and body class; the counts add up to `fixtureCount`. */
  readonly bodyLines: readonly BodyLine[];
}

/** The result of one MVR import: the stage to apply, the scenery to draw, and what the user should be told. */
export interface MvrImport {
  readonly design: StageDesign;
  readonly geometry: MvrGeometry;
  /**
   * Mesh bytes by archive file name, for every placement file the archive holds. Render parses them to draw the
   * placements; it is the counterpart of `MvrExportOptions.meshes`, so an export's meshes come back under one name.
   */
  readonly meshes: ReadonlyMap<string, Uint8Array>;
  /**
   * The files the GLB meshes name by URI and the archive holds (textures, external buffers), keyed by the URI as the
   * glTF writes it, which is the URL the loader asks for. A URI the archive lacks gave a `missing-mesh-resource`.
   */
  readonly meshResources: ReadonlyMap<string, Uint8Array>;
  /**
   * The model files of the GDTFs the fixtures use, by GDTF file name and the path inside that GDTF
   * (`Acme@Spot.gdtf/models/gltf/Head.glb`), each held once. `bodies` says which fixture uses which GDTF.
   */
  readonly gdtfMeshes: ReadonlyMap<string, Uint8Array>;
  /** By MVR fixture uuid: the GDTF geometry tree of the fixture and what its body can be drawn from. */
  readonly bodies: ReadonlyMap<string, FixtureBody>;
  readonly summary: MvrSummary;
  /** Every problem the import survived, in the order the steps met them. */
  readonly warnings: readonly MvrWarning[];
}
