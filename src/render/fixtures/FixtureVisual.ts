import type {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  ShaderMaterial,
  Sprite,
  Texture,
  Vector3,
} from 'three';
import type { Fixture } from '../../domain/Fixture';
import type { BeamUniforms } from './BeamMaterial';
import type { ModelJoints } from './models/ModelContext';

/** The head pose the visual shows: movers ease towards the output, statics snap; `gang` is the gobo rotation. */
export interface VisualPose {
  pan: number;
  tilt: number;
  gang: number;
}

/** An LED screen fixture: its stage screen mesh is its visual and pick target. */
export interface ScreenVisual {
  readonly kind: 'screen';
  readonly fixture: Fixture;
}

/** A device that is no light (a hoist, a hazer): a neutral box that marks its place; nothing lights it. */
export interface DeviceVisual {
  readonly kind: 'device';
  readonly fixture: Fixture;
  readonly g: Group;
  readonly box: Mesh<BoxGeometry, MeshStandardMaterial>;
  /** The visible body's material: the selection tints it, as a light's `bodyMat`. */
  readonly bodyMat: MeshStandardMaterial;
  readonly lensMat: MeshBasicMaterial;
  /**
   * The meshes of its GDTF body; empty when the box is the body. Taking the GDTF source away rebuilds a device with
   * a GDTF body, as the source frees the geometry these meshes draw.
   */
  readonly pick: readonly Mesh[];
}

/** A light's three.js objects and the render-only state the frame update keeps for it. */
export interface LightVisual {
  readonly kind: 'light';
  readonly fixture: Fixture;
  readonly g: Group;
  /** Statics: turned each frame from straight down to the beam direction. */
  readonly pivot: Group;
  readonly head: Mesh;
  readonly lens: Mesh;
  /** Lens distance from the fixture position in world units (model offset x size). */
  readonly lensOff: number;
  /** Only on a GDTF body: the world offset from the fixture position to its real tilt axis, where the beam turns. */
  readonly axisAt?: Vector3;
  /** Only on a GDTF body: `lensOff` ends on the origin of the GDTF Beam geometry, where the cone must start. */
  readonly beamAtLens?: true;
  /** Only on a GDTF body with an axis: the Beam origin `at` in the frame of `holder`; the cone starts there. */
  readonly beamFrom?: { readonly holder: Group; readonly at: Vector3 };
  /** Only from a trusted GDTF: its `BeamRadius` in metres, the radius the beam starts with. */
  readonly beamRadius?: number;
  readonly bodyMat: MeshStandardMaterial;
  readonly lensMat: MeshBasicMaterial;
  readonly beam: Mesh<CylinderGeometry, ShaderMaterial>;
  readonly uniforms: BeamUniforms;
  readonly pool: Mesh<PlaneGeometry, MeshBasicMaterial>;
  readonly glow: Sprite;
  /** Pool textures by gobo slot, cloned on first use so each fixture rotates its own copy. */
  readonly poolTex: (Texture | undefined)[];
  /** The fixture's model scale (T.size). */
  readonly s: number;
  /** Movers with their own yoke and tilt group; null when the pivot turns the head (statics). */
  readonly joints: ModelJoints | null;
  /** Floor units hang upside down, so their pan turns the other way; never set with a `rotation` (G2). */
  readonly flip: boolean;
  readonly pix: Mesh<BoxGeometry, MeshBasicMaterial> | null;
  readonly pose: VisualPose;
}

/** The visual of one rig fixture, in fixture array order (decision 10). */
export type FixtureVisual = ScreenVisual | LightVisual | DeviceVisual;
