import { MeshStandardMaterial, Texture, type Material } from 'three';

/**
 * The desk's dark stage material (sRGB). CAD writers colour scenery by class (white, beige, pure green, cyan,
 * purple) for the drawing, not for the stage; at night a real stage is black steel and cloth, so every untextured
 * part draws in this one colour, close to the built-in venue's dark structure.
 */
const STAGE_DARK = 0x17171b;

/** Whether the material draws a picture the designer chose (a banner, a print) rather than a CAD class colour. */
function isTextured(material: Material): boolean {
  return 'map' in material && material.map instanceof Texture;
}

/**
 * The material imported scenery draws with: untextured parts get one new dark matte stage material (the file's own
 * material is freed), so they pool into one material whatever their file colour; textured parts keep their picture.
 * A textured standard material gets metalness 0: exporters write metalness 1, and a full metal reflects only its
 * environment, which the scene does not have, so it would draw black. It runs before `MaterialPool.adopt`, so the
 * pool keys on the styled look, and LED surfaces never come here: they draw with their own material.
 */
export function styleScenery(material: Material): Material {
  if (isTextured(material)) {
    if (material instanceof MeshStandardMaterial && material.envMap === null) material.metalness = 0;
    return material;
  }
  const { side, transparent, opacity } = material;
  material.dispose();
  return new MeshStandardMaterial({ color: STAGE_DARK, roughness: 1, metalness: 0, side, transparent, opacity });
}
