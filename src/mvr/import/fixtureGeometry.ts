import { byCount } from '../byCount';
import type { ResolvedFixture } from '../design/DesignInput';
import type { MvrWarning } from '../MvrWarning';
import type { MvrScene } from '../scene/MvrScene';

/** The scene without the geometry that light fixtures carry, and the line that says so. */
export interface LightGeometryStep {
  readonly scene: MvrScene;
  readonly warnings: readonly MvrWarning[];
}

/**
 * Drops the mesh placements that belong to a light `<Fixture>`. The MVR text gives a fixture no `Geometries` (its
 * GDTF holds the geometry), but some writers add one. The desk draws a body for every light, so that mesh would
 * draw the fixture twice, at one place. A `device` keeps its own geometry: the desk has no model for it, and the
 * mesh shows what it is. One line counts the fixtures, so the user knows a part of the file is not drawn.
 */
export function withoutLightGeometry(scene: MvrScene, fixtures: readonly ResolvedFixture[]): LightGeometryStep {
  const lights = new Set(fixtures.filter((fixture) => fixture.type !== 'device').map((fixture) => fixture.record.uuid));
  const own = scene.placements.filter((placement) => placement.kind === 'Fixture' && lights.has(placement.uuid));
  if (own.length === 0) return { scene, warnings: [] };
  const dropped = new Set(own);
  const count = new Set(own.map((placement) => placement.uuid)).size;
  const carry = byCount(count, 'fixture carries its', 'fixtures carry their');
  const message = `${count} ${carry} own geometry in the file; the desk draws its body for a light, so that geometry is not drawn.`;
  const placements = scene.placements.filter((placement) => !dropped.has(placement));
  return { scene: { ...scene, placements }, warnings: [{ code: 'fixture-geometry', message }] };
}
