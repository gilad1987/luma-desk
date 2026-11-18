/**
 * Owns LookGenerator on a stage source: looks use only the stage's fixtures and screens, follow a stage change, aim
 * with the stage's presets, and equal the fixed generator on the built-in stage. The built-in golden looks are owned by
 * the look parity suite; the screen step's random draws by screenDraws.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { rng } from '../../../src/core';
import { createTemplate, type TemplateId } from '../../../src/domain/stage/templates';
import type { Cue } from '../../../src/engine/CueList';
import { PRESET_FNS } from '../../../src/engine/presetFunctions';
import { presetFnsOf } from '../../../src/engine/stage/presetFnsOf';
import { buildAutoGroups } from '../../../src/autoshow/autoGroups';
import type { LookOptions } from '../../../src/autoshow/AutoSettings';
import { LookGenerator } from '../../../src/autoshow/LookGenerator';
import type { Section } from '../../../src/autoshow/sections';
import { STYLES, type AutoStyleId } from '../../../src/autoshow/styles';
import { stageService } from './stageService';

const STYLE_IDS = Object.keys(STYLES) as AutoStyleId[];
const SECTIONS: readonly Section[] = ['groove', 'verse', 'chorus', 'hook', 'build', 'drop', 'intro'];
const SCREEN_ON: LookOptions = { energy: 0.85, strobes: true, screen: true };
const OPTIONS: readonly LookOptions[] = [SCREEN_ON, { energy: 1, strobes: true, screen: false }];
const STAGES: readonly [TemplateId, boolean][] = [
  ['empty', false],
  ['theatre', false],
  ['festival', true],
];

/** Every look of every style, section and option set, in a fixed order. */
function allLooks(looks: LookGenerator): Cue[] {
  return STYLE_IDS.flatMap((id) => SECTIONS.flatMap((sec) => OPTIONS.map((o) => looks.generate(STYLES[id], sec, o))));
}

/** The fixture ids a look writes values or phasers on. */
function idsOf(look: Cue): number[] {
  return [...Object.keys(look.vals).map(Number), ...look.fx.flatMap((p) => p.ids)];
}

describe('LookGenerator on the current stage', () => {
  it.each(STAGES)('builds every look on the %s stage from its own fixtures (screen: %s)', (id, hasScreen) => {
    const service = stageService(id);
    const looks = allLooks(new LookGenerator(service.rig, rng(5), service));
    const ids = new Set(looks.flatMap(idsOf));
    expect([...ids].filter((n) => !service.rig.get(n))).toEqual([]);
    const screens = service.rig.screenIds();
    expect(screens.length > 0).toBe(hasScreen);
    expect(screens.every((n) => looks.some((look) => look.vals[n]?.dim))).toBe(true);
  });

  it('gives the same looks for the same seed on the festival stage', () => {
    const service = stageService('festival');
    const first = allLooks(new LookGenerator(service.rig, rng(42), service));
    expect(allLooks(new LookGenerator(service.rig, rng(42), service))).toEqual(first);
  });

  it('gives exactly the looks of the fixed generator on the built-in stage', () => {
    const service = stageService();
    for (const seed of [1, 7, 99]) {
      const fixed = allLooks(new LookGenerator(service.rig, rng(seed)));
      expect(allLooks(new LookGenerator(service.rig, rng(seed), service))).toEqual(fixed);
    }
  });

  it('follows a stage change without re-wiring: the next look uses the new rig only', () => {
    const service = stageService('festival');
    const looks = new LookGenerator(service.rig, rng(3), service);
    expect(looks.generate(STYLES.edm, 'chorus', SCREEN_ON).vals[1001]?.dim).toBeGreaterThan(0);
    service.apply(createTemplate('theatre'), 'builder');
    const ids = allLooks(looks).flatMap(idsOf);
    expect(ids.filter((n) => !service.rig.get(n))).toEqual([]);
    expect(ids.some((n) => service.rig.screenIds().includes(n))).toBe(false);
  });

  it('aims the FOH spots of a verse with the theatre singer preset, not the built-in one', () => {
    const service = stageService('theatre');
    const look = new LookGenerator(service.rig, rng(5), service).generate(STYLES.edm, 'verse', SCREEN_ON);
    const singer = presetFnsOf(service.frame).singer;
    const foh = buildAutoGroups(service.rig, service.design).foh;
    const aims = foh.flatMap((id, k) => {
      const f = service.rig.get(id);
      return f
        ? [{ stage: singer(f, k, foh.length), builtIn: PRESET_FNS.singer(f, k, foh.length), vals: look.vals[id] }]
        : [];
    });
    expect(aims.length).toBeGreaterThan(0);
    for (const { stage, builtIn, vals } of aims) {
      expect(vals).toMatchObject(stage);
      expect(builtIn).not.toEqual(stage);
    }
  });
});
