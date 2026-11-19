import { BufferGeometry, CircleGeometry, Group, Mesh, PlaneGeometry } from 'three';
import { describe, expect, it } from 'vitest';
import { DEFAULT_LENS_RADIUS } from '../../../../src/render/beams/beamIntensity';
import { lensRadiusOf } from '../../../../src/render/beams/lensRadius';

describe('lensRadiusOf', () => {
  it('reads the radius of a round lens in world units, through the scale of the fixture body', () => {
    const lens = new Mesh(new CircleGeometry(1, 24));
    lens.scale.setScalar(0.27);
    const body = new Group().add(lens);
    body.scale.setScalar(0.5);
    expect(lensRadiusOf(lens)).toBeCloseTo(0.135, 5);
  });

  it('gives half the short side of a panel, whatever axis the face has', () => {
    const lens = new Mesh(new PlaneGeometry(1, 1).rotateX(Math.PI / 2));
    lens.scale.set(0.4, 1, 0.12);
    expect(lensRadiusOf(lens)).toBeCloseTo(0.06, 5);
  });

  it('keeps the source between a pin and a panel, and falls back for a body with no lens face', () => {
    const tiny = new Mesh(new CircleGeometry(1, 8));
    tiny.scale.setScalar(0.001);
    const huge = new Mesh(new CircleGeometry(1, 8));
    huge.scale.setScalar(4);
    expect(lensRadiusOf(tiny)).toBe(0.03);
    expect(lensRadiusOf(huge)).toBe(0.3);
    expect(lensRadiusOf(new Mesh(new BufferGeometry()))).toBe(DEFAULT_LENS_RADIUS);
  });

  it('measures a lens once', () => {
    const lens = new Mesh(new CircleGeometry(1, 8));
    lens.scale.setScalar(0.1);
    const first = lensRadiusOf(lens);
    lens.scale.setScalar(0.2);
    expect(lensRadiusOf(lens)).toBe(first);
  });
});
