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
const isAimed = (f: Fixture): boolean => f.T.moving && (f.type === 'spot' || f.type === 'beam');
const mirrorOf = (all: readonly Fixture[], f: Fixture): Fixture | undefined =>
  all.find((m) => m.type === f.type && m.pos.x === -f.pos.x && m.pos.y === f.pos.y && m.pos.z === f.pos.z);
const LOOK_COLORS = ['Magenta', 'Blue', 'White'].map(colorByName);

afterEach(() => vi.restoreAllMocks());

describe.each(['theatre', 'festival'] as const)('buildMvrFirstLook on the %s template', (id) => {
  const { fixtures, cue } = lookOf(id);
  const sided = fixtures.filter((f) => f.pos.x !== 0 && isAimed(f));

  it('is one named cue that opens the dimmers of the look fixtures only', () => {
    expect(cue).toMatchObject({ num: 1, name: MVR_FIRST_LOOK_NAME, fx: [] });
    for (const f of fixtures) {
      const inLook = ['spot', 'beam', 'wash', 'par', 'bar', 'profile'].includes(f.type);
      expect(cue.vals[f.id]?.dim, `fixture ${f.id} (${f.type})`).toBe(inLook ? 100 : undefined);
    }
  });

  it('aims only the spots and beams; washes, pars and bars get colour and dimmer only', () => {
    for (const f of fixtures.filter((x) => cue.vals[x.id] !== undefined)) {
      const keys = Object.keys(valsOf(cue, f)).sort();
      expect(keys, `fixture ${f.id} (${f.type})`).toEqual(
        isAimed(f) ? ['b', 'dim', 'g', 'pan', 'r', 'tilt'] : ['b', 'dim', 'g', 'r'],
      );
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

  it('cycles magenta, blue and white over the mirrored places from the centre outwards', () => {
    const look = fixtures.filter((f) => cue.vals[f.id] !== undefined);
    const place = (f: Fixture): [number, number] => [Math.abs(f.pos.x), f.pos.y];
    const places = [...new Set(look.map((f) => place(f).join('|')))]
      .map((key) => key.split('|').map(Number))
      .sort(([ax = 0, ay = 0], [bx = 0, by = 0]) => ax - bx || ay - by)
      .map((p) => p.join('|'));
    for (const f of look) {
      const { r, g, b } = valsOf(cue, f);
      expect({ r, g, b }, `fixture ${f.id}`).toEqual(LOOK_COLORS[places.indexOf(place(f).join('|')) % 3]);
    }
    expect(new Set(look.map((f) => valsOf(cue, f).g)).size).toBe(3);
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
