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

/** The LED screen fixture: the venue's screen mesh is its visual and pick target. */
export interface ScreenVisual {
  readonly kind: 'screen';
  readonly fixture: Fixture;
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
  /** Floor units hang upside down, so their pan turns the other way. */
  readonly flip: boolean;
  readonly pix: Mesh<BoxGeometry, MeshBasicMaterial> | null;
  readonly pose: VisualPose;
}

/** The visual of one rig fixture, in fixture array order (decision 10). */
export type FixtureVisual = ScreenVisual | LightVisual;
