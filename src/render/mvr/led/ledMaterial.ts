import { MeshStandardMaterial, Texture, Vector3, type Material } from 'three';
import { LED_FRAGMENT, LED_FRAGMENT_PARS, LED_VERTEX, LED_VERTEX_PARS } from './ledShader';
import { ledUniforms, syncLedTime } from './ledUniforms';

/** The black mask of an LED tile between its dots: a dark grey-black with no tint (sRGB). */
const LED_MASK = 0x0a0b0d;

/** What differs between LED materials; the rest is the shared look. */
export interface LedLook {
  /** True for panel proxies, whose instances bring wall coordinates (`ledWall`, `ledAxes`). */
  readonly proxy?: boolean;
  /** The image the file gives for the screen; without one the desk's generated content shows. */
  readonly image?: Texture | undefined;
  /** The world direction a file mesh emits to (`ledFrontOf`); without one every face of the mesh emits. */
  readonly front?: Vector3 | undefined;
  readonly side?: Material['side'];
  readonly transparent?: boolean;
  readonly opacity?: number;
  readonly alphaTest?: number;
}

type Shader = Parameters<Material['onBeforeCompile']>[0];

/**
 * Adds the LED stages to the standard shader and binds the shared uniforms, so all walls follow one level, and the
 * material's own `uLedFront`: materials share the program, and each keeps the uniform values it binds here.
 */
function applyLedShader(shader: Shader, front: Vector3): void {
  Object.assign(shader.uniforms, ledUniforms, { uLedFront: { value: front } });
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', `#include <common>\n${LED_VERTEX_PARS}`)
    .replace('#include <begin_vertex>', `#include <begin_vertex>\n${LED_VERTEX}`);
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `#include <common>\n${LED_FRAGMENT_PARS}`)
    .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${LED_FRAGMENT}`);
}

/**
 * The look of an LED wall: a standard material, so the dark, slightly glossy mask takes the stage light and writes
 * depth and normals as any surface does, plus the wall's emission in the HDR scale (`ledShader`). With the wall off
 * only the mask is left. Fog would grey the far upstage wall, so it ignores fog, as the desk's LED walls do. The
 * material owns no texture: an image stays with the scenery material it came from.
 */
export function createLedMaterial(look: LedLook = {}): MeshStandardMaterial {
  const material = new MeshStandardMaterial({ color: LED_MASK, roughness: 0.42, metalness: 0, fog: false });
  if (look.image) {
    material.emissiveMap = look.image;
    material.emissive.set(0xffffff);
    // A cut-out or see-through banner takes its alpha from its image, and the emissive map brings none: as the
    // colour map too, the image gives the mask its alpha, so the banner keeps its shape.
    if ((look.alphaTest ?? 0) > 0 || look.transparent) material.map = look.image;
  }
  if (look.side !== undefined) material.side = look.side;
  if (look.transparent !== undefined) material.transparent = look.transparent;
  if (look.opacity !== undefined) material.opacity = look.opacity;
  if (look.alphaTest !== undefined) material.alphaTest = look.alphaTest;
  if (look.proxy) material.defines = { ...material.defines, LED_PROXY: '' };
  const front = look.front ?? new Vector3();
  material.userData['ledFront'] = front;
  material.onBeforeCompile = (shader) => applyLedShader(shader, front);
  // three.js 0.160 calls `Material.onBeforeRender` before each draw; its type declarations leave the hook out.
  Object.assign(material, { onBeforeRender: syncLedTime });
  // Every LED material has the same stages; the defines and the map already tell the variants apart.
  material.customProgramCacheKey = () => 'mvr-led';
  return material;
}

/** The front an LED material emits to, a zero vector when every face emits; undefined for any other material. */
export function ledFrontIn(material: Material): Vector3 | undefined {
  const front: unknown = material.userData['ledFront'];
  return front instanceof Vector3 ? front : undefined;
}

/** The LED look of `material` again, with the same image and blending, for a mesh whose `front` is known. */
export function withLedFront(material: Material, front: Vector3): MeshStandardMaterial {
  const map: unknown = 'emissiveMap' in material ? material.emissiveMap : undefined;
  const { side, transparent, opacity, alphaTest } = material;
  const image = map instanceof Texture ? map : undefined;
  return createLedMaterial({ image, side, transparent, opacity, alphaTest, front });
}
