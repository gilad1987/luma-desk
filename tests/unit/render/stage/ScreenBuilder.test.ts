/** The LED walls of a design share one deck strip: the first wall builds it, and every wall drives it. */
import { MeshBasicMaterial, Scene } from 'three';
import { describe, expect, it } from 'vitest';
import type { StageScreen } from '../../../../src/domain/stage/StageDesign';
import { BUILT_IN_DESIGN } from '../../../../src/domain/stage/templates/sultansPool/builtInDesign';
import { buildScreens } from '../../../../src/render/stage/ScreenBuilder';

/** A plain wall without side screens: it builds the wall and its frame, and maybe the strip between them. */
const wall = (fixtureId: number, x0: number): StageScreen => ({
  id: `wall-${fixtureId}`,
  fixtureId,
  x0,
  x1: x0 + 4,
  y0: 2,
  y1: 5,
  z: -10,
});

describe('buildScreens', () => {
  it('builds the one deck strip with the first of two walls, and both walls drive it', () => {
    const scene = new Scene();
    const built = buildScreens(scene, [wall(1, -6), wall(2, 2)], BUILT_IN_DESIGN.deck, new MeshBasicMaterial());
    const [first, second] = built;
    expect(built).toHaveLength(2);
    expect(second?.strip).toBe(first?.strip);
    // each wall adds itself and its frame; the first adds the strip between them, the second adds none
    expect(scene.children).toHaveLength(5);
    expect(scene.children[1]).toBe(first?.strip);
    expect(scene.children[3]).toBe(second?.mesh);
  });
});
