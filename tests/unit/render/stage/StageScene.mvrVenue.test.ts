/** An imported stage shows what its file holds: nothing of the demo venue may be drawn around it. */
import { Line, Mesh, Points, Sprite, type Object3D } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { BUILT_IN_DESIGN } from '../../../../src/domain/stage/templates/sultansPool/builtInDesign';
import { SCENERY_PARTS } from '../../../../src/domain/stage/types';
import { bootStageScene, rebuild } from './stageSceneSetup';

afterEach(() => vi.restoreAllMocks());
afterEach(() => vi.unstubAllGlobals());

const isDrawn = (o: Object3D): boolean =>
  o instanceof Mesh || o instanceof Line || o instanceof Points || o instanceof Sprite;

/** The names of the objects the renderer draws: visible themselves and under visible parents only. */
function drawnNames(roots: readonly Object3D[]): string[] {
  const names: string[] = [];
  for (const root of roots) root.traverseVisible((o) => void (isDrawn(o) && names.push(o.name || o.type)));
  return names;
}

/** A design as the MVR import makes it: the venue of an imported stage, every scenery part off. */
const imported = (base: StageDesign): StageDesign => ({
  ...base,
  venue: { kind: 'mvr' },
  scenery: { deck: false, trusses: false, band: false, ledWall: false, crowd: false },
});

describe('the venue of an imported stage', () => {
  it('draws only its ground: no demo band, crowd, PA, deck, truss or screen', () => {
    const boot = bootStageScene(imported(BUILT_IN_DESIGN));
    for (const part of SCENERY_PARTS) expect(boot.venue.scenery.isVisible(part)).toBe(false);
    expect(drawnNames(boot.scene.children)).toEqual(['mvr-ground']);
    expect(boot.venue.sky).toBeNull();
  });

  it('draws only its ground after a built-in stage with a band and a crowd, too', () => {
    const boot = bootStageScene(BUILT_IN_DESIGN);
    expect(drawnNames(boot.scene.children).length).toBeGreaterThan(10);
    rebuild(boot, imported(createTemplate('festival')));
    expect(drawnNames(boot.scene.children)).toEqual(['mvr-ground']);
  });
});
