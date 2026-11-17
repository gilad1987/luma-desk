import { MeshBasicMaterial, MeshStandardMaterial } from 'three';
import { srgbCanvasTexture } from './srgbCanvasTexture';

/**
 * Materials every fixture model shares: `trim` (dark rubber and plastic details), `panel` (the Robe base front with
 * its screen), `vent` (slotted grilles) and `alu` (bare aluminium, also on the hazer cases).
 */
export interface ModelMaterials {
  readonly trim: MeshStandardMaterial;
  readonly panel: MeshBasicMaterial;
  readonly vent: MeshStandardMaterial;
  readonly alu: MeshStandardMaterial;
}

const ventSlots = (x: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number, n: number): void => {
  x.fillStyle = '#2a2a30';
  x.fillRect(x0, y0, w, h);
  x.fillStyle = '#060607';
  for (let i = 0; i < n; i++) x.fillRect(x0 + 3, y0 + 3 + (i * (h - 6)) / n, w - 6, ((h - 6) / n) * 0.55);
};

// front of a Robe base: vents either side of the RNS2 colour screen (ROBE splash) and its 4 menu buttons
const paintRobePanel = (x: CanvasRenderingContext2D): void => {
  x.fillStyle = '#121215';
  x.fillRect(0, 0, 256, 64);
  ventSlots(x, 6, 8, 74, 48, 8);
  ventSlots(x, 176, 8, 74, 48, 8);
  x.fillStyle = '#050506';
  x.fillRect(88, 6, 80, 52);
  const g = x.createLinearGradient(0, 10, 0, 50);
  g.addColorStop(0, '#1d3f7a');
  g.addColorStop(1, '#0b1730');
  x.fillStyle = g;
  x.fillRect(92, 10, 50, 40);
  x.fillStyle = '#fff';
  x.font = 'bold 13px Arial';
  x.textAlign = 'center';
  x.fillText('ROBE', 116, 35);
  x.fillStyle = '#e03030';
  x.fillRect(135, 28, 3, 3);
  x.fillStyle = '#3a3a40';
  for (let i = 0; i < 4; i++) x.fillRect(148, 12 + i * 10, 14, 6);
};

/** The trim material; it is created before the lens textures, apart from the others (decision 24). */
export function createTrimMaterial(): MeshStandardMaterial {
  return new MeshStandardMaterial({ color: 0x0c0c0e, metalness: 0.4, roughness: 0.6 });
}

/** Completes the set: panel, vent and aluminium, each texture just before its material (decision 24). */
export function createModelMaterials(trim: MeshStandardMaterial): ModelMaterials {
  const panel = new MeshBasicMaterial({ map: srgbCanvasTexture(256, 64, paintRobePanel) });
  const vent = new MeshStandardMaterial({
    color: 0xa0a0a8,
    metalness: 0.5,
    roughness: 0.5,
    map: srgbCanvasTexture(64, 64, (x) => {
      ventSlots(x, 0, 0, 64, 64, 9);
    }),
  });
  const alu = new MeshStandardMaterial({ color: 0xb4b8c0, metalness: 0.85, roughness: 0.32 });
  return { trim, panel, vent, alu };
}
