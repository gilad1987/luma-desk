import { attr, childElement, childElements } from '../xml/elements';
import type { GdtfBody, GdtfNode } from './GdtfBody';
import type { GdtfMode } from './GdtfInfo';
import { buildTree, type TreeParts } from './gdtfTree';
import { firstBeam } from './gdtfTreeSize';
import { readModels } from './readGdtfModels';

/**
 * The models and top-level geometries of a `FixtureType`. `entryNames` are the entry names of the GDTF archive, which
 * the models' mesh files are looked up in. Of two top-level geometries with one name the last wins.
 */
export function readTreeParts(fixtureType: Element, entryNames: readonly string[]): Pick<TreeParts, 'models' | 'tops'> {
  const geometries = childElement(fixtureType, 'Geometries');
  const tops = geometries ? childElements(geometries) : [];
  return {
    models: readModels(fixtureType, entryNames),
    tops: new Map(tops.map((top) => [attr(top, 'Name') ?? '', top] as const)),
  };
}

/**
 * The body of every DMX mode, in mode order. GDTF: the part a channel moves is the geometry its `Geometry` links to,
 * so the pan and tilt parts are the links of the mode's channels with attribute `Pan` and `Tilt`. Fixtures often have
 * many modes over one geometry and the same axes; those modes share one tree, so a big pixel tree is built once.
 */
export function readBodies(
  fixtureType: Element,
  modes: readonly GdtfMode[],
  entryNames: readonly string[],
): GdtfBody[] {
  const parts = readTreeParts(fixtureType, entryNames);
  const trees = new Map<string, GdtfNode>();
  return modes.map((mode) => {
    const top = parts.tops.get(mode.geometry);
    if (top === undefined) return { mode: mode.name, geometry: mode.geometry };
    const linked = (attribute: string): Set<string> =>
      new Set(mode.channels.filter((channel) => channel.attribute === attribute).map((channel) => channel.geometry));
    const pan = linked('Pan');
    const tilt = linked('Tilt');
    const key = [mode.geometry, ...pan, '', ...tilt].join('\n');
    const root = trees.get(key) ?? buildTree(top, { ...parts, pan, tilt });
    trees.set(key, root);
    const beamPath = firstBeam(root);
    return { mode: mode.name, geometry: mode.geometry, root, ...(beamPath ? { beamPath } : {}) };
  });
}
