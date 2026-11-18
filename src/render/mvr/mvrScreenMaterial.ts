import { MeshBasicMaterial, MeshStandardMaterial, Texture, type Material } from 'three';

/** The face of an LED panel that shows nothing: near black, with no tint, as the tiles are (sRGB). */
const PANEL_FACE = 0x0b0c0e;

/** The low glow of a panel that is on but shows no content, so the wall still reads in a blackout (sRGB). */
const PANEL_GLOW = 0x181b21;

/**
 * The level a screen shows its own image at (sRGB grey, multiplied with the image). At full level a white image is
 * above the glow pass's threshold and blooms into a white blob that hides the picture; this keeps white below it.
 */
const IMAGE_LEVEL = 0xc8c8c8;

/**
 * The look of an MVR screen that brings no image: a dark neutral panel with a low glow. The file does not say what
 * the wall shows, so one bright colour on every screen would be invented content; a dark face that still reads on a
 * dark stage is what the data supports. It takes the stage light as the tiles do. Fog would grey the far upstage
 * screen, so it ignores fog, as the desk's LED walls do. No screen fixture drives it: an imported screen is scenery.
 */
export function createMvrScreenMaterial(): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color: PANEL_FACE,
    emissive: PANEL_GLOW,
    roughness: 0.6,
    metalness: 0,
    fog: false,
  });
}

/** The image a scenery material draws with, when it has one. `Material` declares no `map`; each subclass has its own. */
function imageOf(material: Material): Texture | undefined {
  const map: unknown = 'map' in material ? material.map : undefined;
  return map instanceof Texture ? map : undefined;
}

/**
 * The materials the screen placements of one import draw with. A part that brings its own image (a `VideoScreen`
 * with a texture, a printed banner) keeps it and shows it unlit, so it reads on a dark stage as a lit screen does;
 * a part without one gets the shared dark panel. One material is made per scenery material and kept, so placements
 * still share draw calls. It owns the materials it made, not their textures: those stay with the scenery material.
 */
export class MvrScreenMaterials {
  /** The panel every screen part without an image draws with. */
  readonly panel = createMvrScreenMaterial();
  readonly #textured = new Map<Material, MeshBasicMaterial>();

  /** The screen look of a part that would draw with `source` as scenery. */
  of(source: Material): Material {
    const map = imageOf(source);
    if (!map) return this.panel;
    let material = this.#textured.get(source);
    if (!material) {
      const { side, transparent, opacity, alphaTest } = source;
      const look = { map, color: IMAGE_LEVEL, side, transparent, opacity, alphaTest, fog: false };
      material = new MeshBasicMaterial(look);
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
