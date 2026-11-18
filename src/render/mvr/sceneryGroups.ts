import type { Material } from 'three';
import type { MeshPlacement } from '../../mvr/index';
import type { MeshPart } from './MeshPart';

/** Placements of one mesh file that draw its parts with the same materials. */
export interface SceneryGroup {
  readonly parts: readonly MeshPart[];
  readonly placements: readonly MeshPlacement[];
}

/**
 * The scenery placements of one file split by look: `look` gives each placement's material for a part (for example
 * `SceneryLooks.of`), so one file placed as truss in one place and as a deck in another draws both ways. Placements
 * with the same materials stay together, so they still share instanced meshes.
 */
export function sceneryGroups(
  parts: readonly MeshPart[],
  placements: readonly MeshPlacement[],
  look: (source: Material, placement: MeshPlacement) => Material,
): SceneryGroup[] {
  const groups = new Map<string, { parts: MeshPart[]; placements: MeshPlacement[] }>();
  for (const placement of placements) {
    const styled = parts.map(({ geometry, material }) => ({ geometry, material: look(material, placement) }));
    const key = styled.map((part) => part.material.uuid).join('|');
    const group = groups.get(key) ?? { parts: styled, placements: [] };
    group.placements.push(placement);
    groups.set(key, group);
  }
  return [...groups.values()];
}
