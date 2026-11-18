/**
 * Owns the "All Beams" rule of `STANDARD_GROUPS` on a design with a beam for every role on every truss kind: the
 * legacy beams keep their old order, the beams no legacy query takes come last, and every beam is in it once. The
 * exact Sultan's Pool pool is owned by groups.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { rigFromDesign } from '../../../../src/domain/stage/deriveRig.ts';
import { defaultGroupsOf } from '../../../../src/domain/stage/groupsOf.ts';
import type { StageDesign, StageFixture } from '../../../../src/domain/stage/StageDesign.ts';
import { STANDARD_GROUPS } from '../../../../src/domain/stage/standardGroups.ts';
import { sultansPool } from '../../../../src/domain/stage/templates/sultansPool/index.ts';
import type { StageTruss, TrussParams } from '../../../../src/domain/stage/trussTypes.ts';
import { FIXTURE_ROLES, TRUSS_KINDS, type TrussKind } from '../../../../src/domain/stage/types.ts';

const ALL_BEAMS_SLOT = STANDARD_GROUPS.findIndex((rule) => rule.name === 'All Beams') + 1;

/** One shape per kind, used only for a kind the base design has no truss of. */
const PARAMS: Readonly<Record<TrussKind, TrussParams>> = {
  straight: { kind: 'straight', a: [-5, 0, 0], b: [5, 0, 0], section: 0.4 },
  circle: { kind: 'circle', radius: 4, section: 0.4 },
  goalpost: { kind: 'goalpost', width: 8, height: 6, section: 0.4 },
  tower: { kind: 'tower', a: [0, 0, 0], b: [0, 6, 0], section: 0.4 },
  roof: { kind: 'roof', size: [10, 1, 8] },
};

function allBeamsOf(d: StageDesign): number[] {
  const group = defaultGroupsOf(rigFromDesign(d), d)[ALL_BEAMS_SLOT];
  if (group === undefined) throw new Error(`no All Beams group in slot ${ALL_BEAMS_SLOT}`);
  return group.ids;
}

/** The base design with one truss of each kind, adding a truss for each kind it lacks. */
function withEveryKind(base: StageDesign): StageDesign {
  const [first] = base.trusses;
  if (first === undefined) throw new Error('the base design has no truss');
  const added = TRUSS_KINDS.filter((kind) => !base.trusses.some((t) => t.params.kind === kind)).map(
    (kind): StageTruss => ({ ...first, id: `qa-${kind}`, name: `QA ${kind}`, params: PARAMS[kind] }),
  );
  return { ...base, trusses: [...base.trusses, ...added] };
}

/** A beam for each role on no truss and on a truss of each kind. */
function extraBeams(d: StageDesign): StageFixture[] {
  const beam = d.fixtures.find((f) => f.type === 'beam');
  if (beam === undefined) throw new Error("Sultan's Pool has no beam");
  const trussIds = [null, ...TRUSS_KINDS.map((kind) => d.trusses.find((t) => t.params.kind === kind)?.id ?? null)];
  const next = Math.max(...d.fixtures.map((f) => f.id)) + 1;
  return FIXTURE_ROLES.flatMap((role) => trussIds.map((trussId) => ({ ...beam, role, trussId }))).map((f, i) => ({
    ...f,
    id: next + i,
  }));
}

/** Whether one of the six legacy "All Beams" queries takes the beam. */
function isLegacyBeam(d: StageDesign, f: StageFixture): boolean {
  const kind = d.trusses.find((t) => t.id === f.trussId)?.params.kind ?? 'none';
  return ['mid', 'back', 'ring', 'angled'].includes(f.role) || (f.role === 'floor' && ['none', 'tower'].includes(kind));
}

describe('STANDARD_GROUPS All Beams', () => {
  it('keeps the legacy order, puts the other beams last and lists every beam exactly once', () => {
    const base = sultansPool();
    const legacy = allBeamsOf(base);
    const withKinds = withEveryKind(base);
    const extras = extraBeams(withKinds);
    expect(extras).toHaveLength(FIXTURE_ROLES.length * (TRUSS_KINDS.length + 1));
    const design = { ...withKinds, fixtures: [...withKinds.fixtures, ...extras] };
    const ids = allBeamsOf(design);
    const old = new Set(legacy);
    expect(ids.filter((id) => old.has(id))).toStrictEqual(legacy);
    const others = extras.filter((f) => !isLegacyBeam(design, f)).map((f) => f.id);
    expect(new Set(ids.slice(ids.length - others.length))).toStrictEqual(new Set(others));
    const beams = rigFromDesign(design).fixtures.filter((f) => f.type === 'beam');
    expect(new Set(ids)).toStrictEqual(new Set(beams.map((f) => f.id)));
    expect(ids).toHaveLength(beams.length);
  });
});
