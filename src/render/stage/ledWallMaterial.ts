import { Color, ShaderMaterial, type IUniform } from 'three';
import { ledWallFragmentShader, ledWallVertexShader } from '../shaders';

/** The LED content inputs; the wall's screen fixture writes them every frame. */
// a type alias, not an interface: ShaderMaterial needs the implicit index signature of an object type
export type LedWallUniforms = {
  readonly uT: IUniform<number>;
  readonly uDim: IUniform<number>;
  readonly uMode: IUniform<number>;
  readonly uSpd: IUniform<number>;
  readonly uCol: IUniform<Color>;
};

/** One LED wall picture: its own uniforms, so each wall follows its own screen fixture. */
export function createLedWallMaterial(): ShaderMaterial & { uniforms: LedWallUniforms } {
  const uniforms: LedWallUniforms = {
    uT: { value: 0 },
    uDim: { value: 0 },
    uMode: { value: 1 },
    uSpd: { value: 0 },
    uCol: { value: new Color(1, 1, 1) },
  };
  const material = new ShaderMaterial({
    uniforms,
    fog: false,
    vertexShader: ledWallVertexShader,
    fragmentShader: ledWallFragmentShader,
  });
  return Object.assign(material, { uniforms });
}
