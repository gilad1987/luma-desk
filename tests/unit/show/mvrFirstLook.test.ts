import { Vector3 } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AttrValues } from '../../../src/domain/attributes';
import { dirFrom } from '../../../src/domain/aim';
import type { Fixture } from '../../../src/domain/Fixture';
import { rigFromDesign } from '../../../src/domain/stage/deriveRig';
import { frameOf } from '../../../src/domain/stage/StageFrame';
import { createTemplate, type TemplateId } from '../../../src/domain/stage/templates';
import { colorByName } from '../../../src/engine/colorByName';
import type { Cue } from '../../../src/engine/CueList';
import { buildMvrFirstLook, MVR_FIRST_LOOK_NAME } from '../../../src/show/mvrLook/mvrFirstLook';

/** The stage of template `id` as an import leaves it, with its first look. */
function lookOf(id: TemplateId): { readonly fixtures: readonly Fixture[]; readonly cue: Cue } {
  const design = createTemplate(id);
  const rig = rigFromDesign(design);
  const cue = buildMvrFirstLook({ rig, frame: frameOf(design) });
  if (cue === null) throw new Error(`template ${id} gives no first look`);
  return { fixtures: rig.fixtures, cue };
}

const valsOf = (cue: Cue, f: Fixture): AttrValues => cue.vals[f.id] ?? {};
const inLook = (f: Fixture): boolean => ['spot', 'beam', 'wash', 'par', 'bar', 'profile'].includes(f.type);
const isAimed = (f: Fixture): boolean => f.T.moving && inLook(f);
const isKey = (f: Fixture): boolean => f.T.moving && ['spot', 'beam', 'profile'].includes(f.type);
const pick = ({ r, g, b }: AttrValues): AttrValues => ({ r, g, b });

/** The look's dimmer for `f` (a key beam is also moving): static fill 15, moving fill 40, key 100, others none. */
const levelOf = (f: Fixture): number | undefined =>
  inLook(f) ? [15, 40, 100][Number(f.T.moving) + Number(isKey(f))] : undefined;
const mirrorOf = (all: readonly Fixture[], f: Fixture): Fixture | undefined =>
  all.find((m) => m.type === f.type && m.pos.x === -f.pos.x && m.pos.y === f.pos.y && m.pos.z === f.pos.z);
const LOOK_COLORS = ['Magenta', 'Blue', 'White'].map(colorByName);
afterEach(() => vi.restoreAllMocks());

describe.each(['theatre', 'festival'] as const)('buildMvrFirstLook on the %s template', (id) => {
  const { fixtures, cue } = lookOf(id);
  const sided = fixtures.filter((f) => f.pos.x !== 0 && isAimed(f) && f.has('pan'));

  it('is one named cue: key beams full, moving washes 40, static units 15, blinders and strobes off', () => {
    expect(cue).toMatchObject({ num: 1, name: MVR_FIRST_LOOK_NAME, fx: [] });
    for (const f of fixtures) expect(cue.vals[f.id]?.dim, `fixture ${f.id} (${f.type})`).toBe(levelOf(f));
  });

  it('aims and narrows every mover; static units get colour and dimmer only', () => {
    for (const f of fixtures.filter((x) => cue.vals[x.id] !== undefined)) {
      const vals = valsOf(cue, f);
      const keys = Object.keys(vals).sort();
      const moverKeys = (['b', 'dim', 'g', 'pan', 'r', 'tilt', 'zoom'] as const).filter((a) => f.has(a));
      expect(keys, `fixture ${f.id} (${f.type})`).toEqual(isAimed(f) ? moverKeys : ['b', 'dim', 'g', 'r']);
      if (isAimed(f) && f.has('zoom')) expect(vals.zoom).toBe(f.T.zr[0]);
    }
  });

  it('mirrors the pan of each left/right pair and keeps the same tilt and colour', () => {
    const pairs = sided.filter((f) => f.pos.x < 0).flatMap((f) => [[f, mirrorOf(fixtures, f)] as const]);
    const found = pairs.filter((pair): pair is readonly [Fixture, Fixture] => pair[1] !== undefined);
    expect(found.length).toBeGreaterThan(0);
    for (const [left, right] of found) {
      const [l, r] = [valsOf(cue, left), valsOf(cue, right)];
      expect(r.pan, `pair ${left.id}/${right.id}`).toBeCloseTo(-(l.pan ?? NaN), 6);
      expect(r.tilt).toBeCloseTo(l.tilt ?? NaN, 6);
      expect([r.r, r.g, r.b]).toEqual([l.r, l.g, l.b]);
    }
  });

  it('points every side beam across the centre line, so the two fans cross over the stage', () => {
    for (const f of sided) {
      const { pan = NaN, tilt = NaN } = valsOf(cue, f);
      const dir = dirFrom(f, pan, tilt, new Vector3());
      expect(Math.sign(dir.x), `fixture ${f.id} at x ${f.pos.x}`).toBe(-Math.sign(f.pos.x));
    }
  });

  it('gives white to at most about a third of the key beams and never to a fill unit', () => {
    const colorOf = (f: Fixture): string => JSON.stringify(pick(valsOf(cue, f)));
    const [magenta = '', blue = '', white = ''] = LOOK_COLORS.map((c) => JSON.stringify(c));
    const key = fixtures.filter((f) => cue.vals[f.id] !== undefined && isKey(f));
    const fill = fixtures.filter((f) => cue.vals[f.id] !== undefined && !isKey(f));
    const whiteShare = key.filter((f) => colorOf(f) === white).length / key.length;
    expect(whiteShare).toBeGreaterThan(0);
    expect(whiteShare).toBeLessThanOrEqual(0.45);
    expect(fill.every((f) => [magenta, blue].includes(colorOf(f)))).toBe(true);
    const all = new Set([...key, ...fill].map(colorOf));
    expect(all.has(magenta) && all.has(blue)).toBe(true);
  });

  it('is deterministic and draws no random number', () => {
    const random = vi.spyOn(Math, 'random');
    expect(lookOf(id).cue).toEqual(cue);
    expect(random).not.toHaveBeenCalled();
  });
});

describe('buildMvrFirstLook on a stage without look fixtures', () => {
  it('gives no cue', () => {
    const design = createTemplate('empty');
    expect(buildMvrFirstLook({ rig: rigFromDesign(design), frame: frameOf(design) })).toBeNull();
  });
});
