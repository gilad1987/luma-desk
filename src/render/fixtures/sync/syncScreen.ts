import type { Color, PointLight } from 'three';
import type { AttrValues } from '../../../domain/attributes';
import type { SharedUniform } from '../BeamMaterial';
import { outputValue } from './BeamFrame';

/** The LED wall shader inputs (render/stage ledWallMaterial); `uMode` picks the content, `uSpd` its speed. */
export interface ScreenUniforms {
  readonly uT: SharedUniform;
  readonly uDim: SharedUniform;
  readonly uMode: SharedUniform;
  readonly uSpd: SharedUniform;
  readonly uCol: { readonly value: Color };
}

/**
 * Everything the screen fixture drives: the wall uniforms and the deck LED strip (render/stage ScreenBuilder), and
 * its spill light (render core).
 */
export interface ScreenTargets {
  readonly uniforms: ScreenUniforms;
  readonly light: PointLight;
  readonly strip: { readonly material: { readonly color: Color } };
}

/** Drives the screen from its fixture output (gobo = content mode, grot = speed). */
export function syncScreen(targets: ScreenTargets, o: Readonly<AttrValues>, intensity: number, now: number): void {
  const r = outputValue(o, 'r'),
    g = outputValue(o, 'g'),
    b = outputValue(o, 'b');
  const u = targets.uniforms;
  u.uDim.value = intensity;
  u.uCol.value.setRGB(r / 100, g / 100, b / 100);
  u.uMode.value = Math.round(outputValue(o, 'gobo'));
  u.uSpd.value = outputValue(o, 'grot');
  u.uT.value = now;
  targets.light.color.setRGB(r / 100, g / 100, b / 100);
  targets.light.intensity = intensity * 9;
  targets.strip.material.color.setRGB((r / 100) * intensity * 2, (g / 100) * intensity * 2, (b / 100) * intensity * 2);
}
