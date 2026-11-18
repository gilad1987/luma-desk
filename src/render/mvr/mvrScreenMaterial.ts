import type { ShaderMaterial } from 'three';
import { createLedWallMaterial } from '../stage/ledWallMaterial';

/** The LED wall shader's plain content mode: one colour over the LED pixel grid, whatever UVs the mesh file has. */
const PLAIN_MODE = 0;

/** A saturated LED blue (linear RGB); the wall shader's 1.35 gain lifts it past 1, so the bloom pass makes it glow. */
const SCREEN_BLUE: readonly [number, number, number] = [0.1, 0.22, 1];

/**
 * The look of an MVR screen: the desk's own LED wall picture at full output in a saturated blue. No screen fixture
 * drives it (an imported screen is scenery, not patched), so its content stays still until the user builds a screen.
 */
export function createMvrScreenMaterial(): ShaderMaterial {
  const material = createLedWallMaterial();
  material.uniforms.uDim.value = 1;
  material.uniforms.uMode.value = PLAIN_MODE;
  material.uniforms.uCol.value.setRGB(...SCREEN_BLUE);
  return material;
}
