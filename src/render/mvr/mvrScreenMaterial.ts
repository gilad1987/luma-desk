import { MeshBasicMaterial } from 'three';

/**
 * A saturated LED blue (sRGB). It is set below full blue because the renderer's filmic tone mapping lifts it: on screen
 * it ends near this colour, where a full blue would wash out towards a pale periwinkle.
 */
const SCREEN_BLUE = 0x2a4bd7;

/**
 * The look of an MVR screen: one flat, unlit LED blue. The desk's LED wall shader draws its pixel grid and content
 * from UVs in 0..1, which imported meshes do not have (their UVs are arbitrary or absent), so on them the grid turns
 * into a wavy moire; a flat colour needs no UVs. Fog would grey the far upstage screen, so it ignores fog, as the
 * desk's LED walls do. It is tone mapped with the scene, so it reads alike with the glow pass on or off. No screen
 * fixture drives it: an imported screen is scenery, not patched.
 */
export function createMvrScreenMaterial(): MeshBasicMaterial {
  return new MeshBasicMaterial({ color: SCREEN_BLUE, fog: false });
}
