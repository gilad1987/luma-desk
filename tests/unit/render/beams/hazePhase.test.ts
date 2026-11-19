import { describe, expect, it } from 'vitest';
import { HAZE_LIFT, hazeDensity, hazeScatter } from '../../../../src/render/beams/beamIntensity';
import { beamFragmentShader, upsampleFragmentShader } from '../../../../src/render/beams/glsl';
import { SHAFT_LOBES, shaftPhase } from '../../../../src/render/beams/hazePhase';
import { ROLL_OFF } from '../../../../src/render/beams/volumeUniforms';
import { SURFACE_GAIN } from '../../../../src/render/lighting/surfacePhotometry';
import { DEFAULT_ALBEDO, twoLobePhase } from '../../../../src/render/photometry';

/** A constant of the beam shader, read from its text. */
function shaderConstant(name: string): number {
  const found = new RegExp(`const float ${name} = ([-0-9.]+);`).exec(beamFragmentShader);
  return Number(found?.[1] ?? Number.NaN);
}

/** The phase of the beam shader, mirrored line by line: `lobe` and the mix in `main`, with the shader's constants. */
function shaderPhase(mu: number): number {
  const lobe = (g: number, at: number): number => (1 - g * g) / Math.pow(1 + g * g - 2 * g * at, 1.5);
  const forward = shaderConstant('W_FORWARD');
  return lobe(shaderConstant('G_BACK'), mu) * (1 - forward) + lobe(shaderConstant('G_FORWARD'), mu) * forward;
}

/** The mean of `phase` over the sphere: half its integral over mu, by the midpoint rule. */
function sphereMean(phase: (mu: number) => number): number {
  const steps = 20000;
  let sum = 0;
  for (let i = 0; i < steps; i++) sum += phase(-1 + (2 * (i + 0.5)) / steps);
  return sum / steps;
}

describe('the phase of the shafts', () => {
  it('is normalised in the shader: its mean over the sphere is 1, so no light is lost or made', () => {
    expect(sphereMean(shaderPhase)).toBeCloseTo(1, 3);
    expect(Math.abs(sphereMean(shaderPhase) - 1)).toBeLessThan(1e-3);
  });

  it('is the two-lobe phase of the photometry core with the lobes of `SHAFT_LOBES`, in the shader too', () => {
    expect(beamFragmentShader).toContain('return (1.0 - g * g) / pow(1.0 + g * g - 2.0 * g * mu, 1.5);');
    expect(beamFragmentShader).toContain('float phase = mix(lobe(G_BACK, mu), lobe(G_FORWARD, mu), W_FORWARD);');
    expect(beamFragmentShader).toContain('float gain = uHaze.x * phase;');
    for (const mu of [-1, -0.6, 0, 0.3, 0.707, 0.94, 1]) {
      expect(shaderPhase(mu)).toBeCloseTo(4 * Math.PI * twoLobePhase(mu, SHAFT_LOBES), 3);
      expect(shaftPhase(mu)).toBeCloseTo(shaderPhase(mu), 3);
    }
  });

  it('has no factor on one direction: the cut of the light that travels away from the eye is gone', () => {
    expect(beamFragmentShader).not.toMatch(/\bBACK\b/);
    expect(beamFragmentShader).not.toContain('smoothstep(0.0, 1.0, -mu)');
  });

  it('shows a beam that points at the eye brightest and one seen from behind the lamp least', () => {
    expect(shaftPhase(1)).toBeGreaterThan(3 * shaftPhase(0));
    expect(shaftPhase(-1)).toBeLessThan(0.5 * shaftPhase(0));
    // a camera in the front light of a lifted haze: the light straight at the eye stays bounded
    expect(HAZE_LIFT * shaftPhase(1)).toBeLessThan(25);
  });
});

describe('the level of the shafts', () => {
  it('is the physical single scattering times the lift: 3 pi x albedo / (4 pi) per unit of density', () => {
    const physical = (SURFACE_GAIN / 4) * DEFAULT_ALBEDO;
    expect(hazeScatter(1) / hazeDensity(1)).toBeCloseTo(HAZE_LIFT * physical, 9);
    expect(hazeScatter(0.62) / hazeDensity(0.62)).toBeCloseTo(HAZE_LIFT * physical, 9);
  });

  it('rolls the summed beams off by a logarithm: one shaft is kept, and a doubled sum is still brighter', () => {
    const shown = (sum: number): number => ROLL_OFF * Math.log(1 + sum / ROLL_OFF);
    expect(upsampleFragmentShader).toContain('uRollOff * log(1.0 + strongest / uRollOff) / strongest');
    expect(shown(0.01) / 0.01).toBeGreaterThan(0.95);
    // 10 and 20 crossing washes of the reference case (0.098 and 0.195): a clear step, where the earlier curve
    // gave 0.079 and 0.131 of a limit of 0.4 and then nearly none
    expect(shown(0.195) / shown(0.098)).toBeGreaterThan(1.5);
    expect(shown(4) / shown(2)).toBeGreaterThan(1.2);
    // every unit of a large file at full stays a veil under the white of a surface in the key (0.3 per albedo)
    expect(shown(5)).toBeLessThan(0.4);
  });
});
