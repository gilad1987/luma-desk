/** The hand-over of a rebuilt rig, and the checks that refuse a rig the visuals cannot build before anything is freed. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Fixture } from '../../../../src/domain/Fixture';
import { festivalStage } from '../../../../src/domain/stage/templates/festival';
import { setupFixtureVisuals } from './fixtureVisualsSetup';

afterEach(() => vi.restoreAllMocks());
afterEach(() => vi.unstubAllGlobals());

const setup = () => setupFixtureVisuals(festivalStage());

describe('FixtureVisuals.rebuild guards', () => {
  it('hands the new rig to the sync and the picker, and empties them on dispose', () => {
    const { picker, visuals, fixtures, screens } = setup();
    const built = visuals.rebuild(fixtures, screens);
    expect(built.map((v) => v.fixture)).toEqual(fixtures);
    expect(picker.clear).toHaveBeenCalledTimes(1);
    expect(picker.register.mock.calls.some(([o]) => o === screens.values().next().value?.mesh)).toBe(true);
    visuals.dispose();
    expect(visuals.visuals).toEqual([]);
  });

  it('refuses a screen fixture without a slot and keeps the old visuals in the scene', () => {
    const { scene, visuals, fixtures, screens } = setup();
    expect(fixtures.some((f) => f.T.shape === 'screen')).toBe(true);
    const old = visuals.rebuild(fixtures, screens);
    const children = [...scene.children];
    expect(() => visuals.rebuild(fixtures, new Map())).toThrow(/no screen mesh/);
    expect(visuals.visuals).toBe(old);
    expect(scene.children).toEqual(children);
  });

  it('refuses a light type without a model before it frees anything', () => {
    const { scene, picker, visuals, fixtures, screens } = setup();
    visuals.rebuild(fixtures, screens);
    const children = [...scene.children];
    const light = fixtures.find((f) => f.T.shape !== 'screen');
    if (!light) throw new Error('rig has no light');
    // a copy that inherits every field of the light, with a type whose model the table does not have
    const broken = Object.assign(Object.create(light) as Fixture, { T: { ...light.T, model: 'no-such-model' } });
    expect(() => visuals.rebuild([...fixtures, broken], screens)).toThrow(/has no model or size/);
    expect(scene.children).toEqual(children);
    expect(picker.clear).toHaveBeenCalledTimes(1);
  });

  it('setVisuals throws for a screen visual without targets before it replaces the list', () => {
    const { sync, visuals, fixtures, screens, targets } = setup();
    const built = visuals.rebuild(fixtures, screens);
    expect(() => sync.setVisuals(built, new Map())).toThrow(/has no screen targets/);
    const screen = built.find((v) => v.kind === 'screen');
    if (!screen) throw new Error('rig has no screen');
    const spy = vi.spyOn(targets.light, 'intensity', 'set');
    Object.assign(screen.fixture.out, { dim: 50, strobe: 0, r: 100, g: 0, b: 0 });
    sync.update(1, 0.016, targets.light.position);
    expect(spy).toHaveBeenCalled();
  });
});
