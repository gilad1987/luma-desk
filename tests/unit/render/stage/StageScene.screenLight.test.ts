/**
 * The LED wall spill light: only the screen visual writes it, so a stage build with no screen visual must leave it
 * dark, or it keeps the last colour of the old wall and blackout cannot reach it.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setLedWall } from '../../../../src/domain/stage/edit/ledWall';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { BUILT_IN_DESIGN } from '../../../../src/domain/stage/templates/sultansPool/builtInDesign';
import { bootStageScene, rebuild } from './stageSceneSetup';

afterEach(() => vi.restoreAllMocks());
afterEach(() => vi.unstubAllGlobals());

const NO_WALL: Record<string, StageDesign> = {
  'the LED wall hidden': { ...BUILT_IN_DESIGN, scenery: { ...BUILT_IN_DESIGN.scenery, ledWall: false } },
  'the LED wall deleted': setLedWall(BUILT_IN_DESIGN, null),
  'the theatre template': createTemplate('theatre'),
  'the empty template': createTemplate('empty'),
};

describe('StageScene screen light', () => {
  for (const [name, design] of Object.entries(NO_WALL)) {
    it(`goes dark on a rebuild to ${name}`, () => {
      const boot = bootStageScene(BUILT_IN_DESIGN);
      const light = boot.host.screenLight;
      // the built-in wall lit red at full, as syncScreen leaves it
      light.color.setRGB(1, 0, 0);
      light.intensity = 9;
      rebuild(boot, design);
      expect(light.intensity).toBe(0);
    });
  }

  it('is left to the screen visual on a rebuild that keeps the wall', () => {
    const boot = bootStageScene(BUILT_IN_DESIGN);
    const light = boot.host.screenLight;
    light.intensity = 9;
    rebuild(boot, BUILT_IN_DESIGN);
    expect(light.intensity).toBe(9);
  });
});
