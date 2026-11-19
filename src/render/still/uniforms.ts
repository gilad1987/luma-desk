import { Vector2 } from 'three';
import type { IUniform, ShaderMaterial } from 'three';

/** A uniform of a still material, checked, so a renamed uniform fails loudly instead of drawing nothing. */
export function uniform(material: ShaderMaterial, name: string): IUniform<unknown> {
  const found = material.uniforms[name];
  if (!found) throw new Error(`still material has no ${name} uniform`);
  return found;
}

/** A `Vector2` uniform's value, checked, so it is set in place without a cast. */
export function vector2(material: ShaderMaterial, name: string): Vector2 {
  const { value } = uniform(material, name);
  if (!(value instanceof Vector2)) throw new Error(`still uniform ${name} is not a Vector2`);
  return value;
}
