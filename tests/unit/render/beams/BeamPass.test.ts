import { DepthTexture, PerspectiveCamera, Texture, WebGLRenderTarget } from 'three';
import { afterEach, describe, expect, it } from 'vitest';
import { BeamField } from '../../../../src/render/beams/BeamField';
import { hazeScatter, stepsFor } from '../../../../src/render/beams/beamIntensity';
import { BeamPass } from '../../../../src/render/beams/BeamPass';
import { beamVolume } from '../../../../src/render/beams/beamVolume';
import { createBeamPass } from '../../../../src/render/beams/createBeamPass';
import { ROW } from '../../../../src/render/beams/packBeam';
import { createVolumeUniforms, updateVolumeUniforms } from '../../../../src/render/beams/volumeUniforms';
import { PRE_BLOOM } from '../../../../src/render/post/preBloom';
import { meterRenderer } from '../post/meterRenderer';

const createPass = (): BeamPass =>
  new BeamPass({ camera: new PerspectiveCamera(), sceneDepth: { texture: new DepthTexture(1, 1) } }, new Texture());

/** One frame with no lit beam: the pass takes the batch, draws no beam and sets the exposure for a black frame. */
function draw(pass: BeamPass): void {
  const target = new WebGLRenderTarget(1, 1);
  pass.render(meterRenderer().renderer, target, target);
}

afterEach(() => (beamVolume.batch = undefined));

describe('BeamPass', () => {
  it('does not exist for a built-in stage: the fixture sync finds no batch until a chain creates the pass', () => {
    expect(beamVolume.batch).toBeUndefined();
  });

  it('is the last pass the MVR chain inserts before the bloom, after the light on the surfaces', () => {
    expect(PRE_BLOOM.at(-1)).toBe(createBeamPass);
  });

  it('gives the fixture sync its batch while it lives and takes it back on dispose', () => {
    const pass = createPass();
    expect(beamVolume.batch).toBe(pass.batch);
    expect(pass.needsSwap).toBe(false);
    pass.dispose();
    expect(beamVolume.batch).toBeUndefined();
  });

  it('takes the batch when it draws, if a chain built before it and then rejected holds it', () => {
    const rejected = createPass();
    const used = createPass();
    expect(beamVolume.batch).toBe(rejected.batch);
    draw(used);
    expect(beamVolume.batch).toBe(used.batch);
    rejected.dispose();
    expect(beamVolume.batch).toBe(used.batch);
    used.dispose();
  });

  it('frees its gobo sheet; a chain built later and rejected leaves the batch of the pass in use alone', () => {
    const gobo = new Texture();
    let freed = 0;
    gobo.addEventListener('dispose', () => freed++);
    const used = createPass();
    draw(used);
    const camera = new PerspectiveCamera();
    const rejected = new BeamPass({ camera, sceneDepth: { texture: new DepthTexture(1, 1) } }, gobo);
    expect(beamVolume.batch).toBe(used.batch);
    rejected.dispose();
    expect(freed).toBe(1);
    expect(beamVolume.batch).toBe(used.batch);
    used.dispose();
  });
});

describe('volume uniforms', () => {
  it('takes the depth terms and the pixel angle from the camera projection', () => {
    const uniforms = createVolumeUniforms(new Texture(), new Texture(), new Texture());
    const camera = new PerspectiveCamera(60, 16 / 9, 0.1, 500);
    const projection = camera.projectionMatrix.elements;
    updateVolumeUniforms(uniforms, { projection, targetHeight: 720, haze: 0.5, time: 4, count: 250 });
    const { x, y } = uniforms.uProj.value;
    // a depth of 0 is the near plane and a depth of 1 the far plane
    expect(y / (-1 + x)).toBeCloseTo(0.1, 5);
    expect(y / (1 + x)).toBeCloseTo(500, 1);
    expect(uniforms.uPix.value).toBeCloseTo((2 * Math.tan(Math.PI / 6)) / 720, 8);
    expect(uniforms.uHaze.value.x).toBe(hazeScatter(0.5));
    expect(uniforms.uHaze.value.w).toBe(4);
    expect(uniforms.uSteps.value).toBe(stepsFor(250));
  });
});

describe('BeamField', () => {
  it('grows by doubling, so a stage with more beams than the first buffer loses none', () => {
    const field = new BeamField(createVolumeUniforms(new Texture(), new Texture(), new Texture()));
    const first = field.capacity;
    field.reserve(first);
    expect(field.capacity).toBe(first);
    field.reserve(first + 1);
    expect(field.capacity).toBe(first * 2);
    expect(field.data.length).toBe(first * 2 * ROW);
    field.dispose();
  });
});
