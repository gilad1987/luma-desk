import type { CanvasTexture } from 'three';
import { srgbCanvasTexture, type CanvasPainter } from '../shared';
import { BAR_LENS_FACES } from './lens/barLensFaces';
import { MOVER_LENS_FACES } from './lens/moverLensFaces';
import { STATIC_LENS_FACES } from './lens/staticLensFaces';

/** One lens face per fixture model (`FixtureType.model`); FORTE FS shares the FORTE face. */
export type LensTextureSet = Readonly<Record<string, CanvasTexture>>;

/**
 * A face drawn on black, so the unlit parts of the lens stay dark under the fixture colour tint. Exported for the
 * product families, whose faces are painted lazily (`LazyLensTextures`) and so cannot join the set below.
 */
export const lensTexture = (paint: CanvasPainter, w = 128, h = 128): CanvasTexture =>
  srgbCanvasTexture(w, h, (x) => {
    x.fillStyle = '#000';
    x.fillRect(0, 0, w, h);
    paint(x, w, h);
  });

/** Creates the lens faces in the legacy order (decision 24): movers, round statics, WTF!, Tetra2, Source Four. */
export function createLensTextures(): LensTextureSet {
  const forte = lensTexture(MOVER_LENS_FACES.forte);
  return {
    forte,
    megapointe: lensTexture(MOVER_LENS_FACES.megapointe),
    spiider: lensTexture(MOVER_LENS_FACES.spiider),
    parfect: lensTexture(STATIC_LENS_FACES.parfect),
    strike4: lensTexture(STATIC_LENS_FACES.strike4),
    wtf: lensTexture(BAR_LENS_FACES.wtf, 256, 128),
    tetra2: lensTexture(BAR_LENS_FACES.tetra2, 256, 32),
    s4: lensTexture(STATIC_LENS_FACES.s4),
    forteFS: forte,
  };
}
