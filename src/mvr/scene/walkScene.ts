import { multiply, type Mat4 } from '../math/Mat4';
import { MvrError, type MvrWarning } from '../MvrWarning';
import { attr, childElement, childElements } from '../xml/elements';
import { readAuxNames } from './auxNames';
import { readFixture } from './fixtures';
import { BadMatrices } from './BadMatrices';
import { layerInfos } from './layerKeys';
import { localMatrix } from './localMatrix';
import { MeshLimit } from './MeshLimit';
import type { MeshPlacement, MvrFixtureRecord, MvrLayerInfo, MvrScene } from './MvrScene';
import { placementsOf } from './objects';
import type { ProxyPlacement } from './ProxyPlacement';
import { toProxyPlacement } from './proxySeed';
import { SymbolExpander } from './symbols';

/**
 * The deepest `<ChildList>` nesting that is followed. Real files nest groups a few levels; a hostile file nesting
 * thousands would overflow the stack of this recursive walk, so 256 only stops a runaway file.
 */
export const MAX_SCENE_DEPTH = 256;

/** The lists one walk fills; every level of the recursion appends to them, so file order is kept. */
interface Walk {
  readonly symbols: SymbolExpander;
  readonly bad: BadMatrices;
  readonly fixtures: MvrFixtureRecord[];
  readonly placements: MeshPlacement[];
  readonly proxies: ProxyPlacement[];
  readonly focusPoints: Map<string, Mat4>;
  readonly warnings: MvrWarning[];
}

/** Where an element sits: its parent's world matrix, its layer and how many `<ChildList>`s enclose it. */
interface Frame {
  readonly parent: Mat4;
  readonly layer: MvrLayerInfo;
  readonly depth: number;
}

/**
 * Handles one element by tag, then walks its `<ChildList>`. Every tag may carry `<Geometries>` (a fixture's own body,
 * an unknown writer object), except `FocusPoint`, whose geometry only marks an aim point and is not stage geometry.
 */
function walkElement(el: Element, frame: Frame, walk: Walk): void {
  const world = multiply(frame.parent, localMatrix(el, walk.bad));
  if (el.localName === 'Fixture') walk.fixtures.push(readFixture(el, world, frame.layer.uuid));
  if (el.localName === 'FocusPoint') walk.focusPoints.set(attr(el, 'uuid') ?? '', world);
  else addPlacements(placementsOf(el, world, frame.layer, walk.symbols), walk);
  // A FocusPoint reads no geometry, so this takes nothing for it; every other element owns the seeds it just met.
  for (const seed of walk.symbols.empty.swap([])) walk.proxies.push(toProxyPlacement(seed, el, world, frame.layer));
  walkChildren(el, { parent: world, layer: frame.layer, depth: frame.depth + 1 }, walk);
}

/**
 * Appends placements one by one, as a spread of a huge list overflows the stack. They are not counted again: each
 * one is made from a mesh the `SymbolExpander` already counted against the import's mesh budget.
 */
function addPlacements(placements: readonly MeshPlacement[], walk: Walk): void {
  for (const placement of placements) walk.placements.push(placement);
}

/** Walks the `<ChildList>` of any element, known or not, so objects inside unknown groups are not lost. */
function walkChildren(el: Element, frame: Frame, walk: Walk): void {
  const list = childElement(el, 'ChildList');
  if (!list) return;
  if (frame.depth > MAX_SCENE_DEPTH) {
    const message = `Objects nest deeper than ${MAX_SCENE_DEPTH} levels; the deeper ones are left out.`;
    if (!walk.warnings.some((w) => w.code === 'scene-depth')) walk.warnings.push({ code: 'scene-depth', message });
    return;
  }
  for (const child of childElements(list)) walkElement(child, frame, walk);
}

/**
 * Reads the scene of a parsed `GeneralSceneDescription.xml` into plain data: layers, fixtures, mesh placements and
 * focus points, all in file order and in MVR's frame (millimetres, Z up). Matrices compose parent then child, the
 * layer's own matrix included. A file without `<Scene>` holds nothing to import, so it throws
 * `MvrError('no-scene')`; smaller problems become `warnings`.
 */
export function walkScene(doc: Document): MvrScene {
  const scene = childElement(doc.documentElement, 'Scene');
  if (!scene)
    throw new MvrError('no-scene', 'GeneralSceneDescription.xml has no <Scene>, so there is nothing to import.');
  const warnings: MvrWarning[] = [];
  const bad = new BadMatrices(warnings);
  const aux = childElement(scene, 'AUXData');
  const symbols = new SymbolExpander(aux, warnings, new MeshLimit(warnings), bad);
  const walk: Walk = { symbols, bad, fixtures: [], placements: [], proxies: [], focusPoints: new Map(), warnings };
  const layerList = childElement(scene, 'Layers');
  const elements = layerList ? childElements(layerList, 'Layer') : [];
  const layers = layerInfos(elements, warnings);
  elements.forEach((layer, index) => {
    const info = layers[index];
    if (info) walkChildren(layer, { parent: localMatrix(layer, bad), layer: info, depth: 0 }, walk);
  });
  const { fixtures, placements, proxies, focusPoints } = walk;
  return { layers, fixtures, placements, proxies, focusPoints, auxNames: readAuxNames(aux), warnings };
}
