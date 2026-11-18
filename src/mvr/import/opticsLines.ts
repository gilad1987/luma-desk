import type { FixtureTypeId } from '../../domain/FixtureType';
import type { FixtureOptics } from '../../domain/stage/optics/FixtureOptics';
import type { OpticsVerdict } from './fixtureOptics';
import { opticsMessage, type OpticsLineFacts, type OpticsPart } from './opticsWording';

/**
 * One line of the import summary: where the fixtures of one product get their optical data from. The fields are the
 * data of the line, so a UI can word it in its own language; `message` is the English sentence. `parts` lists what
 * the GDTF gives; `reason` is set instead when nothing comes from a GDTF, and the defaults of desk type `type` are
 * then used for everything. `drops` are single values of a trusted GDTF that were not used.
 */
export interface OpticsLine extends OpticsLineFacts {
  readonly message: string;
}

/** A fixture's product name, its desk type and what the trust rule decided for it. */
export interface OpticsEntry {
  /** The GDTF fixture type name, or the scene's `GDTFSpec` when the fixture has no readable GDTF. */
  readonly product: string;
  readonly type: FixtureTypeId;
  readonly verdict: OpticsVerdict;
}

/** The parts of the device data the optics hold. A dimmer or a beam count alone is no part: every fixture has one. */
function partsOf(optics: FixtureOptics | undefined): OpticsPart[] {
  if (optics === undefined) return [];
  const has: readonly (readonly [OpticsPart, boolean])[] = [
    ['optics', optics.zoom !== undefined || optics.beam !== undefined],
    ['panTilt', optics.pan !== undefined || optics.tilt !== undefined],
    ['color', optics.color !== undefined],
    ['gobos', optics.gobos !== undefined],
    ['shaping', optics.shaping !== undefined],
  ];
  return has.filter(([, present]) => present).map(([part]) => part);
}

function toFacts({ product, type, verdict }: OpticsEntry, count: number): OpticsLineFacts {
  const parts = partsOf(verdict.optics);
  const reason = verdict.reason ?? (parts.length === 0 ? 'noData' : undefined);
  const goboWheels = verdict.optics?.gobos?.length ?? 0;
  return { product, type, parts, goboWheels, ...(reason ? { reason } : {}), drops: verdict.drops, count };
}

/**
 * One line per product, desk type and outcome, in the order the scene first shows them. Every fixture is in exactly
 * one line: the counts add up to the fixture count.
 */
export function opticsLines(entries: readonly OpticsEntry[]): OpticsLine[] {
  const groups = new Map<string, { readonly first: OpticsEntry; count: number }>();
  for (const entry of entries) {
    const facts = toFacts(entry, 0);
    const drops = facts.drops.map((drop) => `${drop.part}:${drop.reason}`);
    const key = [facts.product, facts.type, facts.reason ?? '', facts.parts, facts.goboWheels, drops].join('\n');
    const group = groups.get(key) ?? { first: entry, count: 0 };
    group.count += 1;
    groups.set(key, group);
  }
  return [...groups.values()].map(({ first, count }) => {
    const facts = toFacts(first, count);
    return { ...facts, message: opticsMessage(facts) };
  });
}
