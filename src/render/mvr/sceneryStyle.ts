import { Color, MeshStandardMaterial, SRGBColorSpace, Texture, type Material } from 'three';
import { MissingTexture } from './MissingTexture';

/**
 * Stage lightness range (sRGB) of untextured scenery. CAD writers colour scenery for the drawing (white, beige, pure
 * green, cyan), not for the stage, so the file colour is kept only as a hint: its lightness maps into the range of
 * real stage surfaces at night, from black cloth (`DARKEST`) to bare grey steel (`LIGHTEST`), and its hue keeps a
 * fraction (`SATURATION`) of its strength. A mesh with no colour of its own reads as white, so it gets the neutral
 * `LIGHTEST` grey. Both ends stay readable under house light and under the first look.
 */
const DARKEST = 0.1;
const LIGHTEST = 0.36;
const SATURATION = 0.35;

const WHITE = new Color(0xffffff);

/**
 * Whether the material draws a picture the designer chose (a banner, a print) rather than a CAD class colour. A
 * picture the archive lacks (`MissingTexture`) counts as none.
 */
function isTextured(material: Material): boolean {
  return 'map' in material && material.map instanceof Texture && !(material.map instanceof MissingTexture);
}

/** The file colour of `material` moved into the stage range; white when the material has no colour. */
function stageColor(material: Material): Color {
  const file = 'color' in material && material.color instanceof Color ? material.color : WHITE;
  const { h, s, l } = file.getHSL({ h: 0, s: 0, l: 0 }, SRGBColorSpace);
  return new Color().setHSL(h, s * SATURATION, DARKEST + l * (LIGHTEST - DARKEST), SRGBColorSpace);
}

/**
 * The material imported scenery draws with: untextured parts get a new matte material in their file colour moved
 * into the stage range (`stageColor`; the file's own material is freed), so parts of one colour pool into one
 * material; textured parts keep their picture. A textured standard material gets metalness 0: exporters write
 * metalness 1, and a full metal reflects only its environment, which the scene does not have, so it would draw black.
 * It runs before `MaterialPool.adopt`, so the pool keys on the styled look, and LED surfaces never come here: they
 * draw with their own material.
 */
export function styleScenery(material: Material): Material {
  if (isTextured(material)) {
    if (material instanceof MeshStandardMaterial && material.envMap === null) material.metalness = 0;
    return material;
  }
  const { side, transparent, opacity } = material;
  const color = stageColor(material);
  material.dispose();
  return new MeshStandardMaterial({ color, roughness: 1, metalness: 0, side, transparent, opacity });
}
