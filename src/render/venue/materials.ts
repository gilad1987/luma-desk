import { MeshStandardMaterial, RepeatWrapping, SRGBColorSpace } from 'three';
import { createCanvasTexture, drawCanvas } from '../shared';

/** The materials that several venue builders share; one object each, so a colour change reaches every user. */
export interface VenueMaterials {
  /** Near-black steel of risers, amps, PA boxes, delay heads and screen frames. */
  readonly dark: MeshStandardMaterial;
  /** The stage deck with its painted plank texture. */
  readonly deck: MeshStandardMaterial;
  /** Truss aluminium; the truss kit uses it for every chord, lacing and base plate. */
  readonly truss: MeshStandardMaterial;
  /** Matte black of the stage skirt and the back wall. */
  readonly black: MeshStandardMaterial;
}

/** Deck planks: dark base, fine dust specks, then the board seams. */
function paintDeck(x: CanvasRenderingContext2D): void {
  x.fillStyle = '#16161a';
  x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 4000; i++) {
    x.fillStyle = `rgba(255,255,255,${Math.random() * 0.025})`;
    x.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
  }
  x.strokeStyle = '#08080a';
  x.lineWidth = 3;
  for (let i = 0; i <= 4; i++) {
    x.beginPath();
    x.moveTo(i * 128, 0);
    x.lineTo(i * 128, 512);
    x.stroke();
    x.beginPath();
    x.moveTo(0, i * 256);
    x.lineTo(512, i * 256);
    x.stroke();
  }
}

/**
 * Creates the shared venue materials in the legacy order. Two extra materials (the legacy `matStone` and `matPerson`)
 * are created and dropped: no mesh uses them, but each takes a uuid from the seeded `Math.random`, and removing them
 * would shift every later uuid and random value (decision 24).
 */
export function createVenueMaterials(): VenueMaterials {
  const dark = new MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.9, metalness: 0.05 });
  const deckTexture = createCanvasTexture(drawCanvas(512, 512, paintDeck), {
    colorSpace: SRGBColorSpace,
    wrap: RepeatWrapping,
    repeat: [12, 6],
    anisotropy: 8,
  });
  const deck = new MeshStandardMaterial({ color: 0x5a5a60, map: deckTexture, roughness: 0.55, metalness: 0.1 });
  const truss = new MeshStandardMaterial({ color: 0x7a7e86, roughness: 0.35, metalness: 0.85 });
  const black = new MeshStandardMaterial({ color: 0x050506, roughness: 1 });
  void new MeshStandardMaterial({ color: 0x3b352c, roughness: 1, flatShading: true });
  void new MeshStandardMaterial({ color: 0x1b1b20, roughness: 0.85 });
  return { dark, deck, truss, black };
}
