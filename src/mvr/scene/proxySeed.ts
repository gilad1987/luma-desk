import { multiply, type Mat4 } from '../math/Mat4';
import { attr } from '../xml/elements';
import type { LocalMesh } from './LocalMesh';
import type { MvrLayerInfo } from './MvrScene';
import type { ProxyPlacement } from './ProxyPlacement';

/** One placement of an empty Symdef in the frame of the element that holds it, before the owner's world matrix. */
export interface ProxySeed {
  /** Uuid of the empty `<Symdef>`. */
  readonly symdef: string;
  readonly symdefName: string;
  /** Symbol to holder, with any `<Symbol>` and Symdef matrices above it applied. */
  readonly matrix: Mat4;
}

/** What a Symdef gives in its own frame: its meshes, and one seed per empty Symdef placed in it. */
export interface Expansion {
  readonly meshes: readonly LocalMesh[];
  readonly seeds: readonly ProxySeed[];
}

/** The expansion of a Symdef that cannot be used (missing, cyclic, too deep). */
export const NO_EXPANSION: Expansion = { meshes: [], seeds: [] };

/**
 * A seed taken to world space by its owner: the scene element whose `<Geometries>` held the Symbol. The owner gives
 * the object name and the layer, as it does for a mesh placement.
 */
export function toProxyPlacement(seed: ProxySeed, owner: Element, world: Mat4, layer: MvrLayerInfo): ProxyPlacement {
  return {
    symdef: seed.symdef,
    symdefName: seed.symdefName,
    name: attr(owner, 'name') ?? '',
    layer: layer.uuid,
    layerName: layer.name,
    matrix: multiply(world, seed.matrix),
  };
}
