import { BoxGeometry, Group, Mesh, PlaneGeometry } from 'three';
import { describe, expect, it } from 'vitest';
import { CasterScene } from '../../../../src/render/shadow/CasterScene';
import { drawnShare } from '../../../../src/render/shadow/tileCull';
import { bodyItem, oldDrawn, tileCameraAt, triangleItems, volumeOf } from './cullShapes';

/** Four chords, a deck and 40 bodies: 48 + 480 + 7680 triangles. */
const ALL = 8208;

/**
 * A 12 m truss of four chords (each chord is 12 triangles as long as the truss), 40 fixture bodies along it and a
 * 20 x 12 m deck of 1 m quads. The positions are in the geometries, so the old rule (cells in mesh space) and the
 * new one see the same cells.
 */
function rig() {
  const chords = [6.1, 6.4].flatMap((y) =>
    [-0.15, 0.15].map((z) => new Mesh(new BoxGeometry(12, 0.05, 0.05).translate(0, y, z))),
  );
  const deck = new Mesh(new PlaneGeometry(20, 12, 20, 12).rotateX(-Math.PI / 2));
  const root = new Group().add(...chords, deck);
  const body = new BoxGeometry(0.3, 0.4, 0.3, 4, 4, 4);
  const bodies = Array.from({ length: 40 }, (_, i) => {
    const mesh = new Mesh(body);
    mesh.position.set(-5.85 + 0.3 * i, 5.8, 0);
    return mesh;
  });
  const casters = new CasterScene(root);
  casters.setBodies(bodies);
  return { casters, items: [...chords.flatMap(triangleItems), ...triangleItems(deck), ...bodies.map(bodyItem)] };
}

describe('the share of the casters one tile draws', () => {
  it('falls from a third of the rig to the deck under the light', () => {
    const { casters, items } = rig();
    // a fixture on the truss that points down at one spot of the deck with a 20 degree cone
    const camera = tileCameraAt(2.1, 5.6, 6, Math.tan((10 * Math.PI) / 180));
    const before = oldDrawn(camera, items) / ALL;
    const after = drawnShare(volumeOf(camera), [casters.parts, casters.bodies.parts]);
    expect(casters.parts.triangles + casters.bodies.parts.triangles).toBe(ALL);
    // the old sphere of a 4 m cell of bodies reaches the frustum of a light that hangs beside them
    expect(before).toBeGreaterThan(0.3);
    expect(after).toBeLessThan(before / 20);
    // the tile is 2.3 m wide on the deck, so it meets at most 2 x 2 deck cells of 32 triangles: 128 / 8208 = 1.6 %
    expect(after).toBeLessThanOrEqual(128 / ALL);
    expect(after).toBeGreaterThan(0);
    // measured: 32.4 % before (13 bodies, the long chord triangles, the deck cells), 0.8 % after (two deck cells)
    expect([before, after].map((share) => Math.round(share * 1000) / 10)).toEqual([32.4, 0.8]);
  });

  it('still draws the bodies and the chord that stand in the cone', () => {
    const { casters } = rig();
    // from above the truss: the chords and the bodies under the light are in the tile
    const volume = volumeOf(tileCameraAt(2.1, 8, 10, Math.tan((10 * Math.PI) / 180)));
    expect(drawnShare(volume, [casters.bodies.parts])).toBeGreaterThan(0);
    expect(drawnShare(volume, [casters.bodies.parts])).toBeLessThan(0.2);
    expect(drawnShare(volume, [casters.parts])).toBeGreaterThan(0);
  });
});
