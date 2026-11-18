import { MeshBasicMaterial, MeshStandardMaterial } from 'three';

/** The materials the performers and their instruments share. */
export interface BandMaterials {
  /** Dark metal of mic stands, music stands and keyboard legs. */
  readonly kit: MeshStandardMaterial;
  readonly wood: MeshStandardMaterial;
  readonly darkWood: MeshStandardMaterial;
  readonly gold: MeshStandardMaterial;
  readonly silver: MeshStandardMaterial;
  readonly black: MeshStandardMaterial;
  readonly copper: MeshStandardMaterial;
  readonly skin: MeshStandardMaterial;
  /** Five muted clothing colours; a performer without a fixed colour gets a random one. */
  readonly cloth: readonly MeshStandardMaterial[];
  /** The small warm lamp on each music stand. */
  readonly lamp: MeshBasicMaterial;
}

/** Creates the band materials in the legacy order (uuid parity). */
export function createBandMaterials(): BandMaterials {
  const kit = new MeshStandardMaterial({ color: 0x2a2a30, metalness: 0.6, roughness: 0.3 });
  const wood = new MeshStandardMaterial({ color: 0x6b3416, roughness: 0.4, metalness: 0.1 });
  const darkWood = new MeshStandardMaterial({ color: 0x3a1a0a, roughness: 0.4 });
  const gold = new MeshStandardMaterial({ color: 0xc9a040, metalness: 0.9, roughness: 0.25 });
  const silver = new MeshStandardMaterial({ color: 0xb8bcc4, metalness: 0.9, roughness: 0.2 });
  const black = new MeshStandardMaterial({ color: 0x0a0a0b, roughness: 0.5 });
  const copper = new MeshStandardMaterial({ color: 0x9a5530, metalness: 0.8, roughness: 0.3 });
  const skin = new MeshStandardMaterial({ color: 0x7d5e4b, roughness: 0.75 });
  const cloth = [0x3a3a44, 0x4a4650, 0x2f2f37, 0x5a3e4a, 0x34404e].map(
    (c) => new MeshStandardMaterial({ color: c, roughness: 0.85 }),
  );
  const lamp = new MeshBasicMaterial({ color: 0xffd9a0 });
  return { kit, wood, darkWood, gold, silver, black, copper, skin, cloth, lamp };
}
