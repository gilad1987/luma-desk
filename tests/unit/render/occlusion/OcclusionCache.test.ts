import { BoxGeometry, DepthTexture, Mesh, MeshBasicMaterial, PerspectiveCamera, Scene, Texture } from 'three';
import { describe, expect, it } from 'vitest';
import { ambientFragmentShader } from '../../../../src/render/lighting/glsl';
import { MAX_AGE } from '../../../../src/render/lighting/SurfaceCache';
import {
  applyFragmentShader,
  blurFragmentShader,
  occlusionFragmentShader,
} from '../../../../src/render/occlusion/glsl';
import { AO } from '../../../../src/render/occlusion/occlusion';
import { OcclusionCache } from '../../../../src/render/occlusion/OcclusionCache';
import { createOcclusionUniforms } from '../../../../src/render/occlusion/occlusionUniforms';

const SIZE = { width: 1280, height: 720 };

function stage(): { scene: Scene; camera: PerspectiveCamera; box: Mesh } {
  const scene = new Scene();
  const camera = new PerspectiveCamera();
  const box = new Mesh(new BoxGeometry(), new MeshBasicMaterial());
  scene.add(box);
  scene.updateMatrixWorld(true);
  camera.updateMatrixWorld(true);
  return { scene, camera, box };
}

describe('OcclusionCache', () => {
  it('draws the first frame and reuses the image at rest', () => {
    const { scene, camera } = stage();
    const cache = new OcclusionCache();
    expect(cache.isStale(camera, scene, SIZE, true)).toBe(true);
    for (let frame = 1; frame < MAX_AGE; frame++) expect(cache.isStale(camera, scene, SIZE, true)).toBe(false);
    // a move in a vertex shader is in no matrix: the image is drawn again at the age limit of the surface buffers
    expect(cache.isStale(camera, scene, SIZE, true)).toBe(true);
    expect(cache.isStale(camera, scene, SIZE, true)).toBe(false);
  });

  it('draws again when the camera, the size, a mesh or the switch changes', () => {
    const { scene, camera, box } = stage();
    const cache = new OcclusionCache();
    cache.isStale(camera, scene, SIZE, true);
    camera.position.x = 1;
    camera.updateMatrixWorld(true);
    expect(cache.isStale(camera, scene, SIZE, true)).toBe(true);
    expect(cache.isStale(camera, scene, { width: 640, height: 720 }, true)).toBe(true);
    box.position.y = 0.5;
    scene.updateMatrixWorld(true);
    expect(cache.isStale(camera, scene, { width: 640, height: 720 }, true)).toBe(true);
    scene.add(new Mesh(new BoxGeometry(), new MeshBasicMaterial()));
    expect(cache.isStale(camera, scene, { width: 640, height: 720 }, true)).toBe(true);
    expect(cache.isStale(camera, scene, { width: 640, height: 720 }, false)).toBe(true);
    expect(cache.isStale(camera, scene, { width: 640, height: 720 }, false)).toBe(false);
    // a mesh that gets an unlit material becomes an emitter without a move
    box.material = new MeshBasicMaterial();
    expect(cache.isStale(camera, scene, { width: 640, height: 720 }, false)).toBe(true);
    expect(cache.isStale(camera, scene, { width: 640, height: 720 }, false)).toBe(false);
  });
});

describe('occlusion programs', () => {
  it('have no clock, so the sample pattern is the same in every frame', () => {
    for (const source of [occlusionFragmentShader, blurFragmentShader, applyFragmentShader]) {
      expect(source).not.toMatch(/uTime|uFrame|uSeed/);
    }
    expect(occlusionFragmentShader).toContain('bayer4(vec2(cell))');
  });

  it('shade the bounce of the surface light through the shared chunk', () => {
    expect(ambientFragmentShader).toContain('float openAt(ivec2 pixel)');
    expect(ambientFragmentShader).toContain('fragColor.rgb *= openAt(pixel);');
  });

  it('take the radius, strength and bias from the named constants', () => {
    const uniforms = createOcclusionUniforms(new DepthTexture(1, 1), new Texture());
    expect(uniforms.uAo.value.toArray()).toEqual([AO.radius, AO.strength, AO.bias, AO.maxPixels]);
    expect(uniforms.uMask.value.y).toBeGreaterThan(uniforms.uMask.value.x);
  });
});
