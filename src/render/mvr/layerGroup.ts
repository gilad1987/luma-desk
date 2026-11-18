import { Group, type Material, type Matrix4 } from 'three';
import type { Vec3 } from '../../domain/stage/types';
import { isScreenPlacement, type MeshPlacement } from '../../mvr/index';
import { instancedMeshes } from './instancedMeshes';
import type { MeshPart } from './MeshPart';
import { mergeStatic, type SinglePlacement } from './mergeStatic';
import { placementMatrix } from './placementMatrix';
import { sceneryGroups } from './sceneryGroups';

/**
 * What layers draw with: the parsed parts of each file, the screen look of a part by its scenery material, and the
 * class look (`SceneryLooks`) a scenery placement draws a part with, by the part's library material.
 */
export interface LayerParts {
  readonly byFile: ReadonlyMap<string, readonly MeshPart[]>;
  readonly screen: (source: Material) => Material;
  readonly scenery: (source: Material, placement: MeshPlacement) => Material;
}

/** A layer while it is built: instanced meshes go straight into `group`, single placements wait to be merged. */
interface LayerBuild {
  readonly group: Group;
  readonly singles: SinglePlacement[];
}

/** Adds the placements of one file in one look: a lone placement waits to be merged, more share instanced meshes. */
function addPlacements(layer: LayerBuild, parts: readonly MeshPart[], matrices: readonly Matrix4[]): void {
  const [first, ...others] = matrices;
  if (!first) return;
  if (others.length === 0) layer.singles.push({ parts, matrix: first });
  else instancedMeshes(parts, matrices).forEach((mesh) => layer.group.add(mesh));
}

/**
 * One layer's group, from its placements by mesh file: shared files as instanced meshes, files placed once merged per
 * material. Screen placements (`isScreenPlacement`) draw the file's geometry with the screen look of each part, so
 * one file can be scenery in one place and a screen in another.
 */
export function layerGroup(
  files: ReadonlyMap<string, readonly MeshPlacement[]>,
  parts: LayerParts,
  offset: Vec3,
): Group {
  const layer: LayerBuild = { group: new Group(), singles: [] };
  const matrixOf = (placement: MeshPlacement): Matrix4 => placementMatrix(placement, offset);
  for (const [file, placements] of files) {
    const fileParts = parts.byFile.get(file) ?? [];
    const screenParts = fileParts.map(({ geometry, material }) => ({ geometry, material: parts.screen(material) }));
    const sceneryPlacements = placements.filter((placement) => !isScreenPlacement(placement));
    // one file can be truss in one place and a deck in another, so each look keeps its own placements
    for (const g of sceneryGroups(fileParts, sceneryPlacements, parts.scenery)) {
      addPlacements(layer, g.parts, g.placements.map(matrixOf));
    }
    addPlacements(layer, screenParts, placements.filter(isScreenPlacement).map(matrixOf));
  }
  mergeStatic(layer.singles).forEach((mesh) => layer.group.add(mesh));
  return layer.group;
}
