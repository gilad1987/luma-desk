import { NoColorSpace, type CanvasTexture } from 'three';
import { rng } from '../../core';
import { createCanvasTexture, drawCanvas } from '../shared';
import { GOBO_MASKS, type GoboMaskPainter } from './goboMasks';

/**
 * The gobo images in slot order: `textures` for the floor pools (rotated about their centre), `icons` (48 px data
 * URLs) for the gobo pool buttons, and the `glow` sprite every lens flare uses. Gobo and glow textures keep no colour
 * space: they are masks, and an sRGB decode would change their falloff.
 */
export interface GoboAtlas {
  readonly textures: readonly CanvasTexture[];
  readonly icons: readonly string[];
  readonly glow: CanvasTexture;
}

/** The mask cut by a round, soft-edged aperture; `soft` blurs the mask edge like an out-of-focus gobo. */
function drawGobo(S: number, slot: number, paintMask: GoboMaskPainter, soft = true): HTMLCanvasElement {
  const R = S / 2;
  const r = rng(slot * 99 + 7);
  const mask = drawCanvas(S, S, (mx) => {
    mx.fillStyle = '#fff';
    paintMask(mx, S, R, r);
  });
  return drawCanvas(S, S, (x) => {
    const g = x.createRadialGradient(R, R, 0, R, R, R);
    g.addColorStop(0, '#fff');
    g.addColorStop(0.78, '#fff');
    g.addColorStop(0.98, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, S, S);
    x.globalCompositeOperation = 'destination-in';
    if (soft) x.filter = `blur(${S / 90}px)`;
    x.drawImage(mask, 0, 0);
    x.filter = 'none';
  });
}

const paintGlow = (x: CanvasRenderingContext2D): void => {
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, '#fff');
  g.addColorStop(0.12, 'rgba(255,255,255,.9)');
  g.addColorStop(0.35, 'rgba(255,255,255,.25)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
};

/** Builds the atlas; the 8 gobo textures and then the glow texture, in that order (decision 24). */
export function createGoboAtlas(): GoboAtlas {
  const canvases = GOBO_MASKS.map((mask, slot) => drawGobo(128, slot, mask));
  const icons = GOBO_MASKS.map((mask, slot) => drawGobo(48, slot, mask, false).toDataURL());
  const textures = canvases.map((c) => createCanvasTexture(c, { colorSpace: NoColorSpace, center: [0.5, 0.5] }));
  const glow = createCanvasTexture(drawCanvas(64, 64, paintGlow), { colorSpace: NoColorSpace });
  return { textures, icons, glow };
}
