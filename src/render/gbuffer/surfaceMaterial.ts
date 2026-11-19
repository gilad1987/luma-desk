import { Color, DoubleSide, GLSL3, MeshBasicMaterial, ShaderMaterial, Texture } from 'three';
import type { Material } from 'three';
import { noDataFragmentShader, surfaceFragmentShader, surfaceVertexShader } from './glsl';

/** The base colour of a material that names none (a custom shader): a neutral grey. Shared, never changed. */
export const NEUTRAL_COLOR = new Color(0.2, 0.2, 0.2);
/**
 * The base colour of an unlit material with an image (an LED screen): the dark face of a panel that is off. Its
 * image is light the panel emits, not paint: a beam must not reflect it. Shared, never changed.
 */
export const SCREEN_COLOR = new Color(0.04, 0.04, 0.04);

/**
 * Whether a material is an opaque surface that a light can land on. It is the test of what the scene pass writes
 * to the depth: a transparent or additive material (a glow, a decal, a faded floor edge) has no place there, and
 * the readers of the buffers fall back to the depth for its pixels.
 */
export function isSurface(material: Material): boolean {
  return material.visible && !material.transparent && material.depthWrite && material.colorWrite;
}

/** Whether a mesh with this material, or one of these, writes depth in the scene pass. */
export function writesDepth(material: Material | readonly Material[]): boolean {
  if (!Array.isArray(material)) return (material as Material).visible && (material as Material).depthWrite;
  for (const one of material as readonly Material[]) if (one.visible && one.depthWrite) return true;
  return false;
}

/**
 * The material that draws a mesh into the surface buffers in place of `source`. It reads what a light needs from
 * the source: base colour and its map, roughness and metalness (a material without them is matt and no metal), the
 * side, flat shading and the alpha test of a cut-out. The colour is the source's own `Color` object, so a later
 * change is followed. The colours of instances are read by the shader; vertex colours and a map transform are not.
 */
export function createSurfaceMaterial(source: Material): ShaderMaterial {
  const image = 'map' in source && source.map instanceof Texture ? source.map : null;
  const isScreen = source instanceof MeshBasicMaterial && image !== null;
  const own = 'color' in source && source.color instanceof Color ? source.color : NEUTRAL_COLOR;
  const map = isScreen ? null : image;
  const roughness = 'roughness' in source && typeof source.roughness === 'number' ? source.roughness : 1;
  const metalness = 'metalness' in source && typeof source.metalness === 'number' ? source.metalness : 0;
  const isFlat = 'flatShading' in source && source.flatShading === true;
  const isCut = map !== null && source.alphaTest > 0;
  return new ShaderMaterial({
    uniforms: {
      uColor: { value: isScreen ? SCREEN_COLOR : own },
      uRoughness: { value: roughness },
      uMetalness: { value: metalness },
      uAlphaTest: { value: source.alphaTest },
      tMap: { value: map },
    },
    defines: {
      ...(map ? { USE_SURFACE_MAP: '' } : {}),
      ...(isFlat ? { FLAT_SHADED: '' } : {}),
      ...(isCut ? { USE_ALPHA_CUT: '' } : {}),
    },
    vertexShader: surfaceVertexShader,
    fragmentShader: surfaceFragmentShader,
    glslVersion: GLSL3,
    side: source.side,
  });
}

/** The one material of every mesh that writes depth but is no surface: "no mesh" in both buffers (`SceneSwap`). */
export function createNoDataMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: surfaceVertexShader,
    fragmentShader: noDataFragmentShader,
    glslVersion: GLSL3,
    side: DoubleSide,
  });
}
