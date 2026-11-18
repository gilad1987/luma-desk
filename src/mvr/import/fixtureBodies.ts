import type { MvrArchive } from '../archive/MvrArchive';
import type { GdtfBody } from '../gdtf/GdtfBody';
import { TYPES } from '../../domain/fixtureTypes';
import { gdtfBodyClass, type BodyVerdict } from '../gdtf/gdtfBodyClass';
import { gdtfTreeSize, largestTrusted } from '../gdtf/gdtfBodySize';
import { meshCache, meshTreeSize } from '../gdtf/gdtfMeshBox';
import { treeModels } from '../gdtf/gdtfTreeSize';
import type { MvrWarning } from '../MvrWarning';
import { bodyDraw, type BodyPlan } from './bodyDraw';
import { bodyLines, type BodyEntry, type BodyLine } from './bodyWarnings';
import { gdtfBudget, type ByteBudget } from '../gdtf/gdtfEntries';
import { gdtfMeshes, meshKey } from './gdtfMeshes';
import { meshUses } from './meshUses';
import { withProductSize } from './productSizes';
import type { ResolvedRig } from './resolveFixtures';

/** What one fixture's body can be drawn from. */
export interface FixtureBody extends BodyVerdict, BodyPlan {
  /** The product name of the fixture's summary line (`BodyEntry.product`), so the draw step can rewrite that line. */
  readonly product: string;
  /** The archive name of the fixture's GDTF file: the first part of its `gdtfMeshes` keys (`meshKey`). */
  readonly gdtfFile?: string;
  /** The geometry tree of the fixture's mode; fixtures of one GDTF and mode share it. Absent without a GDTF. */
  readonly body?: GdtfBody;
}

/** The body data of a rig. */
export interface FixtureBodies {
  /** A map of its own: the draw step takes each file out when it has parsed it, so the bytes are not held twice. */
  readonly gdtfMeshes: Map<string, Uint8Array>;
  /** By MVR fixture uuid; one entry per fixture, a device included. */
  readonly bodies: ReadonlyMap<string, FixtureBody>;
  /**
   * `rig.bodySizes` with the size measured on the real meshes for every fixture that has them, so the desk position
   * (`placeBodies`) and the drawn box (`plan.box`) use one size. `importMvr` passes it on in place of `rig.bodySizes`.
   */
  readonly bodySizes: ReadonlyMap<string, number>;
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
 * Gives every fixture its body: the geometry tree of its GDTF mode, the model files of that tree (unpacked
 * once per GDTF file) and the class a later draw step picks its fallback by. A device (a hoist, a hazer) gets one
 * too, because it is a fixture: its GDTF geometry is what the user knows it by. `deskSizes` is for a file the desk
 * exported: its fixtures are desk types and keep the desk's own size, so a show comes back as it went out; any
 * other file gets real product sizes (`withProductSize`).
 */
export function fixtureBodies(
  archive: MvrArchive,
  rig: ResolvedRig,
  deskSizes = false,
  budget: ByteBudget = gdtfBudget(),
): FixtureBodies {
  const cache = new Map<GdtfBody, readonly string[]>();
  const picks = rig.fixtures.map((fixture) => {
    const info = rig.infos.get(fixture.record.gdtfSpec);
    const body = info?.bodies.find((candidate) => candidate.mode === fixture.mode) ?? info?.bodies[0];
    return { fixture, record: fixture.record, info, body, paths: pathsOf(body, cache) };
  });
  const read = gdtfMeshes(archive, meshUses(picks), budget);
  const bodies = new Map<string, FixtureBody>();
  const entries: BodyEntry[] = [];
  const boxes = meshCache();
  const bodySizes = new Map(rig.bodySizes);
  for (const { fixture, record, info, body, paths } of picks) {
    const keys = info ? paths.map((path) => meshKey(info.fileName, path)) : [];
    const mesh = { hasMesh: keys.some((key) => read.meshes.has(key)), baked: keys.some((key) => read.baked.has(key)) };
    const verdict = gdtfBodyClass(info, fixture.mode, record.gdtfSpec, mesh);
    // the size is measured on the real meshes when the archive has them; else on the model sizes the GDTF read took
    const measured = info && body && meshTreeSize(body, (path) => read.meshes.get(meshKey(info.fileName, path)), boxes);
    const size = measured ?? (info && gdtfTreeSize(info, fixture.mode));
    const real = mesh.hasMesh ? largestTrusted(measured) : undefined;
    if (real !== undefined) bodySizes.set(record.uuid, real);
    const drawn = bodyDraw(verdict, body?.root, size, TYPES[fixture.type].moving);
    const names = [info?.name, record.gdtfSpec, record.name];
    const plan = deskSizes ? drawn : withProductSize(drawn, names, fixture.type);
    const product = info?.name || record.gdtfSpec || record.name;
    bodies.set(record.uuid, {
      product,
      ...verdict,
      ...plan,
      ...(info ? { gdtfFile: info.fileName } : {}),
      ...(body ? { body } : {}),
    });
    entries.push({ product, verdict, plan, noGdtf: info === undefined });
  }
  return { gdtfMeshes: new Map(read.meshes), bodies, bodySizes, lines: bodyLines(entries), warnings: read.warnings };
}
