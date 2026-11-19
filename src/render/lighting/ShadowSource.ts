import type { Matrix4, Texture } from 'three';

/**
 * Which fixtures have a shadow map and how a light shader reads it. The surface light knows shadows only through
 * this, so the key shadows of this folder can give way to a general shadow atlas.
 */
export interface ShadowSource {
  /** The layer of the shadow map of a fixture, or -1 while it has none (also while its first map is not drawn). */
  layerOf(fixtureId: number): number;
  /** Depth of every layer in one texture, compared on read (`sampler2DShadow`, less or equal is lit). */
  readonly texture: Texture;
  /** Per layer: world position to the texture coordinates and the depth of that layer. */
  readonly matrices: readonly Matrix4[];
}

/** What the packing of the light rows asks of the shadows: a say in who has a map. The shadows write the layers. */
export interface ShadowLayers {
  /** Offers the lit row of a fixture, packed at `index`, as a key light of this frame. */
  offer(fixtureId: number, index: number, row: Float32Array): void;
}
