import type { MvrArchive } from '../archive/MvrArchive';
import type { GdtfBody } from '../gdtf/GdtfBody';
import { gdtfBodyClass, type BodyVerdict } from '../gdtf/gdtfBodyClass';
import { treeModels } from '../gdtf/gdtfTreeSize';
import type { MvrWarning } from '../MvrWarning';
import { bodyLines, type BodyEntry, type BodyLine } from './bodyWarnings';
import { gdtfMeshes, meshKey } from './gdtfMeshes';
import type { ResolvedRig } from './resolveFixtures';

/** What one fixture's body can be drawn from. */
export interface FixtureBody extends BodyVerdict {
  /** The archive name of the fixture's GDTF file: the first part of its `gdtfMeshes` keys (`meshKey`). */
  readonly gdtfFile?: string;
  /** The geometry tree of the fixture's mode; fixtures of one GDTF and mode share it. Absent without a GDTF. */
  readonly body?: GdtfBody;
}

/** The body data of a rig. */
export interface FixtureBodies {
  readonly gdtfMeshes: ReadonlyMap<string, Uint8Array>;
  /** By MVR fixture uuid; one entry per light fixture. */
  readonly bodies: ReadonlyMap<string, FixtureBody>;
  readonly lines: readonly BodyLine[];
  readonly warnings: readonly MvrWarning[];
}

/** The entry paths of the mesh files a body names; kept per body, because hundreds of fixtures share a few bodies. */
function pathsOf(body: GdtfBody | undefined, cache: Map<GdtfBody, readonly string[]>): readonly string[] {
  if (body?.root === undefined) return [];
  const paths = cache.get(body) ?? treeModels(body.root).flatMap((model) => model.path ?? []);
  cache.set(body, paths);
  return paths;
}

/**
 * Gives every light fixture its body: the geometry tree of its GDTF mode, the model files of that tree (unpacked
 * once per GDTF file) and the class a later draw step picks its fallback by. Objects get none: the desk does not
 * draw a body for them.
 */
export function fixtureBodies(archive: MvrArchive, rig: ResolvedRig): FixtureBodies {
  const cache = new Map<GdtfBody, readonly string[]>();
  const picks = rig.fixtures.map((fixture) => {
    const info = rig.infos.get(fixture.record.gdtfSpec);
    const body = info?.bodies.find((candidate) => candidate.mode === fixture.mode) ?? info?.bodies[0];
    return { fixture, info, body, paths: pathsOf(body, cache) };
  });
  const uses = new Map<string, Set<string>>();
  for (const { info, paths } of picks) {
    if (info === undefined) continue;
    const wanted = uses.get(info.fileName) ?? new Set<string>();
    paths.forEach((path) => wanted.add(path));
    uses.set(info.fileName, wanted);
  }
  const read = gdtfMeshes(archive, uses);
  const bodies = new Map<string, FixtureBody>();
  const entries: BodyEntry[] = [];
  for (const { fixture, info, body, paths } of picks) {
    const { record } = fixture;
    const keys = info ? paths.map((path) => meshKey(info.fileName, path)) : [];
    const mesh = { hasMesh: keys.some((key) => read.meshes.has(key)), baked: keys.some((key) => read.baked.has(key)) };
    const verdict = gdtfBodyClass(info, fixture.mode, record.gdtfSpec, mesh);
    bodies.set(record.uuid, { ...verdict, ...(info ? { gdtfFile: info.fileName } : {}), ...(body ? { body } : {}) });
    entries.push({ product: info?.name || record.gdtfSpec || record.name, verdict, noGdtf: info === undefined });
  }
  return { gdtfMeshes: read.meshes, bodies, lines: bodyLines(entries), warnings: read.warnings };
}
