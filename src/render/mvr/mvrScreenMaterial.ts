import { Texture, type Material, type MeshStandardMaterial } from 'three';
import { createLedMaterial } from './led/ledMaterial';
import { isPlaceholderImage, noteReplacedImage, resetReplacedImages } from './led/ledPlaceholder';

/**
 * The look of an MVR screen that brings no image: the LED wall look with the desk's generated content at the wall
 * level (`led/ledMaterial`). The file does not say what the wall shows, and the summary says so. With the walls off
 * it is the black mask, which takes the stage light as the tiles do. No screen fixture drives it: an imported
 * screen is scenery.
 */
export function createMvrScreenMaterial(): MeshStandardMaterial {
  return createLedMaterial();
}

/**
 * The image a scenery material draws with, when it has one. `Material` declares no `map`; each subclass has its own.
 */
function imageOf(material: Material): Texture | undefined {
  const map: unknown = 'map' in material ? material.map : undefined;
  return map instanceof Texture ? map : undefined;
}

/** Width and height of a decoded image; a texture whose image still loads has none. */
function sizeOf(image: unknown): { width?: number; height?: number } {
  if (typeof image !== 'object' || image === null || !('width' in image) || !('height' in image)) return {};
  const { width, height } = image;
  return typeof width === 'number' && typeof height === 'number' ? { width, height } : {};
}

/**
 * The materials the screen placements of one import draw with. A part that brings its own image (a `VideoScreen`
 * with a texture, a printed banner) shows it as the wall's content; a part without one, or with a CAD placeholder
 * image (`isPlaceholderImage`, by the image or material name), gets the shared wall with generated content. One material is made per scenery material and kept, so placements
 * still share draw calls. It owns the materials it made, not their textures: those stay with the scenery material.
 */
export class MvrScreenMaterials {
  /** The panel every screen part without an image draws with. */
  readonly panel = createMvrScreenMaterial();
  readonly #textured = new Map<Material, Material>();

  constructor() {
    resetReplacedImages();
  }

  /** The screen look of a part that would draw with `source` as scenery. */
  of(source: Material): Material {
    const map = imageOf(source);
    if (!map) return this.panel;
    const names = `${map.name} ${source.name}`;
    if (isPlaceholderImage({ name: names, ...sizeOf(map.image) })) {
      // The file's image is not shown, so it is counted: the summary says how many were replaced.
      noteReplacedImage(map);
      return this.panel;
    }
    let material = this.#textured.get(source);
    if (!material) {
      const { side, transparent, opacity, alphaTest } = source;
      material = createLedMaterial({ image: map, side, transparent, opacity, alphaTest });
      this.#textured.set(source, material);
    }
    return material;
  }

  dispose(): void {
    this.panel.dispose();
    for (const material of this.#textured.values()) material.dispose();
    this.#textured.clear();
  }
}
