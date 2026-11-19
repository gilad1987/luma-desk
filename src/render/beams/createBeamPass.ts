import { CanvasTexture, LinearMipmapLinearFilter, NoColorSpace } from 'three';
import { createGoboAtlas } from '../fixtures/GoboAtlas';
import { BeamPass } from './BeamPass';
import type { BeamPassContext } from './BeamPass';

const CELL = 128;
const COLUMNS = 4;
const ROWS = 2;

/**
 * The gobo images of the floor pools on one sheet, slot by slot from the top left, so every beam of the instanced
 * draw reads its gobo from one texture. It is built from the same drawing as the pools, so shaft and pool agree.
 */
function createGoboSheet(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = COLUMNS * CELL;
  canvas.height = ROWS * CELL;
  const context = canvas.getContext('2d');
  const atlas = createGoboAtlas();
  atlas.textures.slice(0, COLUMNS * ROWS).forEach((texture, slot) => {
    const image = texture.image as CanvasImageSource;
    context?.drawImage(image, (slot % COLUMNS) * CELL, Math.floor(slot / COLUMNS) * CELL, CELL, CELL);
  });
  // the atlas was only a source of images; its textures never reached the GPU
  atlas.textures.forEach((texture) => texture.dispose());
  atlas.glow.dispose();
  const sheet = new CanvasTexture(canvas);
  sheet.colorSpace = NoColorSpace;
  // row 0 of the canvas is row 0 of the cells in the shader
  sheet.flipY = false;
  // The shafts read mip level 3 (`GOBO_LOD` in `glsl/scatter.glsl`); the pools read level 0 by name, so they do
  // not change. A level is a box filter over 2 x 2 texels and a cell is 128 wide, so no level mixes two cells.
  sheet.generateMipmaps = true;
  sheet.minFilter = LinearMipmapLinearFilter;
  return sheet;
}

const sheets = new WeakMap<BeamPassContext['sceneDepth'], CanvasTexture>();

/**
 * The gobo sheet of the chain that owns this scene depth: one texture for the shafts and for the light on the
 * surfaces, so the two cannot differ and the GPU holds one copy. The beam pass owns it and frees it; the surface
 * light only reads it. A chain built after that gets a new sheet.
 */
export function goboSheetOf({ sceneDepth }: Pick<BeamPassContext, 'sceneDepth'>): CanvasTexture {
  const known = sheets.get(sceneDepth);
  if (known) return known;
  const sheet = createGoboSheet();
  sheets.set(sceneDepth, sheet);
  sheet.addEventListener('dispose', () => sheets.delete(sceneDepth));
  return sheet;
}

/** Creates the volumetric beam pass of an MVR stage with the gobo sheet of its chain. */
export function createBeamPass(context: BeamPassContext): BeamPass {
  return new BeamPass(context, goboSheetOf(context));
}
