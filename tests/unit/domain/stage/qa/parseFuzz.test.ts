/**
 * QA3: seeded random damage to valid designs. Catches a parser that throws on an odd value, rejects without saying
 * why, or accepts a design that does not survive its own JSON or cannot become a rig. Single rules: parse*.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { rng } from '../../../../../src/core/rng.ts';
import { rigFromDesign } from '../../../../../src/domain/stage/deriveRig.ts';
import { parseStageDesign } from '../../../../../src/domain/stage/parse/parseStageDesign.ts';
import { createTemplate } from '../../../../../src/domain/stage/templates/index.ts';
import { jsonRoundTrip } from '../../../../shared/index.ts';
import { SAMPLE } from '../parseSample.ts';

type Slot = { readonly parent: Record<string, unknown> | unknown[]; readonly key: string | number };

const DROP = Symbol('drop');
const BAD_VALUES: readonly (() => unknown)[] = [
  () => DROP,
  () => Number.NaN,
  () => Number.POSITIVE_INFINITY,
  () => '5',
  () => null,
  () => [],
  () => ({}),
  () => [1, 2, 3],
  () => true,
  () => -1,
  () => 0.5,
  () => 'screen',
  () => new Array<number>(50_000).fill(0),
];

/** Every key and index below `root`, the root itself excluded. */
function slotsOf(root: unknown, out: Slot[] = []): Slot[] {
  if (typeof root !== 'object' || root === null) return out;
  const parent = root as Record<string, unknown> | unknown[];
  for (const key of Array.isArray(parent) ? parent.keys() : Object.keys(parent)) {
    out.push({ parent, key });
    slotsOf((parent as Record<string | number, unknown>)[key], out);
  }
  return out;
}

function damage(design: object, seed: number): unknown {
  const raw = jsonRoundTrip(design);
  const rand = rng(seed);
  const hits = 1 + Math.floor(rand() * 3);
  for (let i = 0; i < hits; i++) {
    const slots = slotsOf(raw);
    const slot = slots[Math.floor(rand() * slots.length)];
    const value = BAD_VALUES[Math.floor(rand() * BAD_VALUES.length)]?.();
    if (!slot) continue;
    const target = slot.parent as Record<string | number, unknown>;
    if (value !== DROP) target[slot.key] = value;
    else if (Array.isArray(slot.parent)) slot.parent.splice(Number(slot.key), 1);
    else delete target[slot.key];
  }
  return raw;
}

/** The facts every result must hold; a list so one failing seed shows all of them. */
function checkResult(raw: unknown): unknown[] {
  const result = parseStageDesign(raw);
  if (!result.ok) return ['rejected', result.errors.length > 0, result.errors.every((e) => typeof e === 'string')];
  const again = parseStageDesign(jsonRoundTrip(result.design));
  const rig = rigFromDesign(result.design);
  return ['accepted', again.ok, rig.fixtures.length === result.design.fixtures.length];
}

const BASES: readonly [string, object][] = [
  ['the parse sample', SAMPLE],
  ['the theatre template', createTemplate('theatre')],
  ['the festival template', createTemplate('festival')],
];

describe('QA3 parseStageDesign fuzz', () => {
  it.each(BASES)('never throws on 300 damaged copies of %s and always explains a rejection', (_, base) => {
    const outcomes = Array.from({ length: 300 }, (_, seed) => checkResult(damage(base, seed + 1)));
    const bad = outcomes.filter((o) => o[1] !== true || o[2] !== true);
    const kinds = new Set(outcomes.map((o) => o[0]));
    expect([bad, kinds.has('rejected')]).toStrictEqual([[], true]);
  });

  it('rejects random top-level values that are not designs, with errors and no throw', () => {
    const rand = rng(7);
    const values = Array.from({ length: 100 }, () => BAD_VALUES[Math.floor(rand() * BAD_VALUES.length)]?.());
    const results = values.map((v) => parseStageDesign(v === DROP ? undefined : v));
    expect(results.filter((r) => r.ok || r.errors.length === 0)).toStrictEqual([]);
  });

  it('rejects a huge fixtures array of one repeated fixture by duplicate id, without throwing', () => {
    const raw = jsonRoundTrip(createTemplate('theatre')) as { fixtures: unknown[] };
    raw.fixtures = new Array<unknown>(20_000).fill(raw.fixtures[0]);
    const result = parseStageDesign(raw);
    expect([result.ok, result.ok ? 0 : result.errors.length]).toStrictEqual([false, 19_999]);
  });
});
