import { Color, MeshStandardMaterial, Texture, type Material } from 'three';

/**
 * How much of its own colour an untextured scenery material keeps. MVR writers default to light grey or beige, which
 * glares under the desk's stage light; at this share white ends near the built-in venue's dark steel (`0x0c0c0e`).
 */
const NIGHT_SHADE = 0.06;

/** The least roughness of scenery: matte, so a light sheen does not come back through the highlights. */
const MATTE_ROUGHNESS = 0.9;

/**
 * Gives a file's scenery material the desk's night look in place: dark and matte, with the file's hue kept as a hint.
 * A material with a texture stays as the file drew it, since the texture is the designer's own picture (a banner, a
 * print), not a default.
 */
export function applyNightLook(material: Material): void {
  if ('map' in material && material.map instanceof Texture) return;
  if ('color' in material && material.color instanceof Color) material.color.multiplyScalar(NIGHT_SHADE);
  if ('specular' in material && material.specular instanceof Color) material.specular.setScalar(0);
  if (material instanceof MeshStandardMaterial) material.roughness = Math.max(material.roughness, MATTE_ROUGHNESS);
}
