import type { Color, PointLight } from 'three';
import type { AttrValues } from '../../../domain/attributes';
import type { SharedUniform } from '../BeamMaterial';
import { outputValue } from './BeamFrame';

/** The LED wall shader inputs (venue LedWall); `uMode` picks the content, `uSpd` its speed. */
export interface ScreenUniforms {
  readonly uT: SharedUniform;
  readonly uDim: SharedUniform;
  readonly uMode: SharedUniform;
  readonly uSpd: SharedUniform;
  readonly uCol: { readonly value: Color };
}

/** Everything the screen fixture drives: wall uniforms (venue), its spill light (render core), the deck LED strip. */
export interface ScreenTargets {
  readonly uniforms: ScreenUniforms;
  readonly light: PointLight;
  readonly strip: { readonly material: { readonly color: Color } };
}

/**
 * Drives the screen from its fixture output (gobo = content mode, grot = speed). It also advances the beam
 * haze-noise time: the legacy code did that only here, so the haze stands still in a rig without a screen.
 */
export function syncScreen(
  targets: ScreenTargets,
  beamTime: SharedUniform,
  o: Readonly<AttrValues>,
  I: number,
  now: number,
): void {
  const r = outputValue(o, 'r'),
    g = outputValue(o, 'g'),
    b = outputValue(o, 'b');
  const u = targets.uniforms;
  u.uDim.value = I;
  u.uCol.value.setRGB(r / 100, g / 100, b / 100);
  u.uMode.value = Math.round(outputValue(o, 'gobo'));
  u.uSpd.value = outputValue(o, 'grot');
  u.uT.value = now;
  beamTime.value = now;
  targets.light.color.setRGB(r / 100, g / 100, b / 100);
  targets.light.intensity = I * 9;
  targets.strip.material.color.setRGB((r / 100) * I * 2, (g / 100) * I * 2, (b / 100) * I * 2);
}
