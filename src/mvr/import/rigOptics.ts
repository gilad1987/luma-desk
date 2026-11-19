import type { FixtureTypeId } from '../../domain/FixtureType';
import type { FixtureOptics } from '../../domain/stage/optics/FixtureOptics';
import type { StageDesign } from '../../domain/stage/StageDesign';
import type { MvrArchive } from '../archive/MvrArchive';
import type { ByteBudget } from '../gdtf/gdtfEntries';
import type { MvrWarning } from '../MvrWarning';
import { fixtureOptics, type OpticsVerdict } from './fixtureOptics';
import { goboImages } from './goboImages';
import { opticsLines, type OpticsEntry, type OpticsLine } from './opticsLines';
import type { ResolvedRig } from './resolveFixtures';

/** The optics step of an import. */
export interface RigOptics {
  /** The design with `optics` on the MVR facts of every fixture whose GDTF is trusted for it. */
  readonly design: StageDesign;
  readonly lines: readonly OpticsLine[];
  /** Wheel slot images by `goboImageKey`, for the wheels of the fixtures in use. */
  readonly images: Map<string, Uint8Array>;
  readonly warnings: readonly MvrWarning[];
}

/** The image names of every wheel slot of the optics. */
function imagesOf(optics: FixtureOptics): string[] {
  const wheels = [...(optics.gobos ?? []), ...(optics.color?.wheels ?? []), ...(optics.shaping?.prisms ?? [])];
  return wheels.flatMap((wheel) => wheel.slots.flatMap((slot) => slot.image ?? []));
}

function withOptics(design: StageDesign, byUuid: ReadonlyMap<string, OpticsVerdict>): StageDesign {
  if (design.mvr === undefined) return design;
  const entries = Object.entries(design.mvr.fixtures).map(([id, info]) => {
    const { optics, mixesColour } = byUuid.get(info.uuid) ?? {};
    const mixed = mixesColour ? { mixesColour } : {};
    return [id, optics === undefined ? info : { ...info, optics, ...mixed }] as const;
  });
  return { ...design, mvr: { ...design.mvr, fixtures: Object.fromEntries(entries) } };
}

/**
 * Reads the optical data of every fixture from its GDTF, by the trust rule of `fixtureOptics`, once per GDTF and
 * mode: the fixtures of one product share one data object. The optics are computed from the GDTF files of this
 * archive only. A desk export holds no GDTF file and no optics, so its re-import gives fixtures without optics (line
 * reason `noGdtf`) and the desk type's defaults apply; the export itself is not changed by this step. `design` is
 * the finished design: its fixture types are the final ones (the luma data of a desk export restores them), and the
 * summary names the type whose defaults apply.
 */
export function rigOptics(archive: MvrArchive, rig: ResolvedRig, design: StageDesign, budget: ByteBudget): RigOptics {
  const types = new Map<string, FixtureTypeId>();
  for (const info of Object.values(design.mvr?.fixtures ?? {})) types.set(info.uuid, info.type);
  const cache = new Map<string, OpticsVerdict>();
  const byUuid = new Map<string, OpticsVerdict>();
  const uses = new Map<string, Set<string>>();
  const entries: OpticsEntry[] = [];
  for (const { record, mode, type } of rig.fixtures) {
    const info = rig.infos.get(record.gdtfSpec);
    const key = `${record.gdtfSpec}\n${mode}`;
    let verdict = cache.get(key);
    if (verdict === undefined) {
      verdict = fixtureOptics(info, record.gdtfSpec, mode);
      cache.set(key, verdict);
      const wanted = uses.get(info?.fileName ?? '') ?? new Set<string>();
      for (const image of verdict.optics ? imagesOf(verdict.optics) : []) wanted.add(image);
      if (info !== undefined) uses.set(info.fileName, wanted);
    }
    byUuid.set(record.uuid, verdict);
    entries.push({ product: info?.name || record.gdtfSpec, type: types.get(record.uuid) ?? type, verdict });
  }
  const read = goboImages(archive, uses, budget);
  return { design: withOptics(design, byUuid), lines: opticsLines(entries), ...read };
}
