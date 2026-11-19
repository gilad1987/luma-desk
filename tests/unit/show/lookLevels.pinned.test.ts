/**
 * The levels of the first look on the two built-in templates, pinned literally by fixture type. Theatre: 6 beams
 * and 4 spots at 100, 6 spots at 20, 6 washes at 85, 4 pars at 25, 2 blinders at 5. Festival: 12 spots at 48, 27
 * of 60 beams lit at 80 (33 at 0), 38 of 40 washes lit from 50 to 100 (20 at 100), 2 follow spots at 60, 8 bars at
 * 12, 8 pars at 25, 8 blinders at 5.
 */
import { describe, expect, it } from 'vitest';
import { rigFromDesign } from '../../../src/domain/stage/deriveRig';
import { frameOf } from '../../../src/domain/stage/StageFrame';
import { createTemplate, type TemplateId } from '../../../src/domain/stage/templates';
import { buildMvrFirstLook } from '../../../src/show/mvrLook/mvrFirstLook';

/** The level of every fixture type in the look, as "level x count" from dark to bright. */
function levelsByType(id: TemplateId): Record<string, string> {
  const design = createTemplate(id);
  const rig = rigFromDesign(design);
  const cue = buildMvrFirstLook({ rig, frame: frameOf(design) });
  const counts = new Map<string, Map<number, number>>();
  for (const f of rig.fixtures) {
    const dim = cue?.vals[f.id]?.dim;
    if (dim === undefined) continue;
    const byLevel = counts.get(f.type) ?? new Map<number, number>();
    counts.set(f.type, byLevel.set(dim, (byLevel.get(dim) ?? 0) + 1));
  }
  const text = (byLevel: Map<number, number>): string =>
    [...byLevel]
      .sort((a, b) => a[0] - b[0])
      .map(([dim, n]) => `${dim} x ${n}`)
      .join(', ');
  return Object.fromEntries([...counts].sort().map(([type, byLevel]) => [type, text(byLevel)]));
}

describe('the pinned levels of the first look', () => {
  it('on the theatre template', () => {
    expect(levelsByType('theatre')).toMatchInlineSnapshot(`
      {
        "beam": "100 x 6",
        "blinder": "5 x 2",
        "par": "25 x 4",
        "spot": "53 x 6, 100 x 4",
        "wash": "85 x 6",
      }
    `);
  });

  it('on the festival template', () => {
    expect(levelsByType('festival')).toMatchInlineSnapshot(`
      {
        "bar": "12 x 8",
        "beam": "0 x 33, 80 x 27",
        "blinder": "5 x 8",
        "follow": "60 x 2",
        "par": "25 x 8",
        "spot": "100 x 12",
        "wash": "0 x 2, 50 x 12, 80 x 2, 85 x 4, 100 x 20",
      }
    `);
  });
});
