import {
  BoxGeometry,
  Color,
  MeshBasicMaterial,
  PlaneGeometry,
  ShaderMaterial,
  type IUniform,
  type Material,
  type Mesh,
  type Object3D,
} from 'three';
import { DECK, SCREEN, STAGE } from '../../domain/venue';
import { ledWallFragmentShader, ledWallVertexShader } from '../shaders';
import { addMesh } from '../shared';

/** The LED content inputs; the screen fixture (2001) writes them every frame. */
// a type alias, not an interface: ShaderMaterial needs the implicit index signature of an object type
export type LedWallUniforms = {
  readonly uT: IUniform<number>;
  readonly uDim: IUniform<number>;
  readonly uMode: IUniform<number>;
  readonly uSpd: IUniform<number>;
  readonly uCol: IUniform<Color>;
};

/** The LED wall handles that later code needs. */
export interface LedWall {
  /** The upstage screen; also the screen fixture's visual and pick target. */
  readonly screen: Mesh<PlaneGeometry, ShaderMaterial>;
  readonly uniforms: LedWallUniforms;
  /** The LED strip under the deck nosing, coloured by the screen fixture. */
  readonly strip: Mesh<BoxGeometry, MeshBasicMaterial>;
}

/**
 * Builds the LED wall: the main screen, two angled side screens that share its material (same content), their
 * frames, the deck-edge LED strip and the main screen's frame, in the legacy order.
 */
export function buildLedWall(scene: Object3D, dark: Material): LedWall {
  const uniforms: LedWallUniforms = {
    uT: { value: 0 },
    uDim: { value: 0 },
    uMode: { value: 1 },
    uSpd: { value: 0 },
    uCol: { value: new Color(1, 1, 1) },
  };
  const screen = addMesh(
    scene,
    new PlaneGeometry(SCREEN.x1 - SCREEN.x0, SCREEN.y1 - SCREEN.y0),
    new ShaderMaterial({
      uniforms,
      fog: false,
      vertexShader: ledWallVertexShader,
      fragmentShader: ledWallFragmentShader,
    }),
    { position: [0, (SCREEN.y0 + SCREEN.y1) / 2, SCREEN.z] },
  );
  for (const sx of [-1, 1]) {
    const rotation = [0, -sx * 0.38, 0] as const;
    addMesh(scene, new PlaneGeometry(12, 6.75), screen.material, { position: [sx * 33.5, 15, 4], rotation });
    addMesh(scene, new BoxGeometry(12.5, 7.2, 0.35), dark, {
      position: [sx * 33.5 + sx * 0.07, 15, 4 - 0.2],
      rotation,
    });
  }
  const strip = addMesh(
    scene,
    new BoxGeometry(STAGE.x1 - STAGE.x0, 0.06, 0.06),
    new MeshBasicMaterial({ color: 0x000000, toneMapped: false }),
    { position: [0, DECK - 0.12, STAGE.z1 + 0.06] },
  );
  addMesh(scene, new BoxGeometry(SCREEN.x1 - SCREEN.x0 + 0.4, SCREEN.y1 - SCREEN.y0 + 0.4, 0.3), dark, {
    position: [0, (SCREEN.y0 + SCREEN.y1) / 2, SCREEN.z - 0.2],
  });
  return { screen, uniforms, strip };
}
