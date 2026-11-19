import { BoxGeometry, InstancedMesh, Matrix3, MeshBasicMaterial, MeshStandardMaterial, Texture, Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { noDataFragmentShader, surfaceFragmentShader, surfaceVertexShader } from '../../../../src/render/gbuffer/glsl';
import { createNoDataMaterial, createSurfaceMaterial } from '../../../../src/render/gbuffer/surfaceMaterial';
import { SCREEN_COLOR, writesDepth } from '../../../../src/render/gbuffer/surfaceMaterial';
import { SurfaceMaterials } from '../../../../src/render/gbuffer/SurfaceMaterials';
import { audiencePass } from '../../../../src/render/venue/audience/audienceShader';

/** The normal transform of `surface.vert.glsl` on the CPU: the cofactors of the placement, then unit length or 0. */
function turnNormal(m: Matrix3, normal: Vector3): Vector3 {
  const [a, b, c] = [new Vector3(), new Vector3(), new Vector3()].map((v, i) => v.setFromMatrix3Column(m, i));
  if (!a || !b || !c) return new Vector3();
  const rows = [b.clone().cross(c), c.clone().cross(a), a.clone().cross(b)];
  const turned = new Vector3();
  rows.forEach((row, i) => turned.addScaledVector(row, normal.getComponent(i)));
  return turned.lengthSq() > 0 ? turned.normalize() : turned.set(0, 0, 0);
}

describe('the shaders of the surface buffers', () => {
  it('turn a normal with the cofactors: no NaN for a flat instance matrix, the inverse transpose otherwise', () => {
    expect(surfaceVertexShader).not.toContain('inverse(');
    expect(surfaceVertexShader).toContain(
      'mat3(cross(m[1], m[2]), cross(m[2], m[0]), cross(m[0], m[1])) * objectNormal',
    );
    expect(surfaceVertexShader).toContain('size > 0.0 ? turned * inversesqrt(size) : vec3(0.0)');
    const flat = turnNormal(new Matrix3().set(1, 0, 0, 0, 0, 0, 0, 0, 1), new Vector3(1, 0, 0));
    expect(flat.toArray()).toEqual([0, 0, 0]);
    expect(turnNormal(new Matrix3().set(0, 0, 0, 0, 0, 0, 0, 0, 0), new Vector3(0, 1, 0)).toArray()).toEqual([0, 0, 0]);
    // a stretched placement in millimetres: the normal of a slope still turns the right way and has unit length
    const stretched = new Matrix3().set(0.004, 0, 0, 0, 0.001, 0, 0, 0, 0.001);
    const expected = new Vector3(1, 1, 0).applyMatrix3(stretched.clone().invert().transpose()).normalize();
    expect(turnNormal(stretched, new Vector3(1, 1, 0)).distanceTo(expected)).toBeLessThan(1e-9);
  });

  it('give an unlit material with an image (an LED screen) a fixed dark base colour and no map', () => {
    const screen = createSurfaceMaterial(new MeshBasicMaterial({ map: new Texture(), color: 0xffffff }));
    expect(screen.uniforms['uColor']?.value).toBe(SCREEN_COLOR);
    expect(screen.uniforms['tMap']?.value).toBeNull();
    expect(screen.defines).not.toHaveProperty('USE_SURFACE_MAP');
    expect(SCREEN_COLOR.r).toBeLessThan(0.08);
  });

  it('multiply the base colour by the colour of the instance, and cut the holes of an alpha test', () => {
    // three.js 0.160 defines USE_COLOR in a fragment stage for instance colours, and no other name
    expect(surfaceFragmentShader).toMatch(/#ifdef USE_COLOR\n[^#]*albedo \*= vColor\.rgb;/);
    expect(surfaceVertexShader).toContain('#include <color_vertex>');
    const map = new Texture();
    const leaf = createSurfaceMaterial(new MeshStandardMaterial({ map, alphaTest: 0.5 }));
    expect(leaf.defines).toHaveProperty('USE_ALPHA_CUT');
    expect(leaf.uniforms['uAlphaTest']?.value).toBe(0.5);
    expect(createSurfaceMaterial(new MeshStandardMaterial({ map })).defines).not.toHaveProperty('USE_ALPHA_CUT');
    expect(surfaceFragmentShader).toContain('if (texel.a < uAlphaTest) discard;');
  });

  it('write no data, with depth, for a mesh that is no surface', () => {
    expect(noDataFragmentShader).toContain('gNormal = vec4(0.0);');
    expect(noDataFragmentShader).toContain('gSurface = vec4(0.0);');
    const noData = createNoDataMaterial();
    expect([noData.depthWrite, noData.depthTest, noData.transparent]).toEqual([true, true, false]);
    expect(writesDepth(new MeshBasicMaterial({ transparent: true }))).toBe(true);
    expect(writesDepth([new MeshBasicMaterial({ depthWrite: false }), new MeshStandardMaterial()])).toBe(true);
    expect(writesDepth(new MeshBasicMaterial({ depthWrite: false }))).toBe(false);
  });

  it('free the audience clone of a surface material when the audience frees its own material', () => {
    const own = new MeshStandardMaterial();
    const people = new InstancedMesh(new BoxGeometry(), own, 2);
    const materials = new SurfaceMaterials();
    const clone = audiencePass(materials.of(own), { uTime: { value: 0 } });
    const freed = vi.fn();
    clone.addEventListener('dispose', freed);
    // the audience layer frees the material of its meshes: the surface material goes, and its clone with it
    people.material.dispose();
    expect(freed).toHaveBeenCalledTimes(1);
    expect(materials.size).toBe(0);
  });
});
