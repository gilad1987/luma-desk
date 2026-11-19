import { Color, MeshStandardMaterial, type IUniform, type Material } from 'three';
import { HAIRS, SKINS, TROUSERS } from './palette';

/** The audience clock, shared by every audience material: seconds, written once per frame. */
export interface AudienceUniforms {
  readonly uTime: IUniform<number>;
}

/** `audienceTurn` is the head turn of the instance: a fixed yaw and nod from its phase `aLook.w`, and a slow look. */
const pars = `
attribute vec2 aPart;
attribute vec4 aHead;
attribute vec4 aLook;
uniform vec3 uSkin[${SKINS.length}];
uniform vec3 uHair[${HAIRS.length}];
uniform vec3 uLegs[${TROUSERS.length}];
uniform float uTime;
vec3 audienceTurn(vec3 v) {
  float yaw = 0.3 * sin(aLook.w * 91.7) + 0.05 * sin(uTime * 0.23 + aLook.w * 31.0);
  float nod = 0.1 * sin(aLook.w * 57.3);
  vec3 p = vec3(v.x, cos(nod) * v.y - sin(nod) * v.z, sin(nod) * v.y + cos(nod) * v.z);
  return vec3(cos(yaw) * p.x + sin(yaw) * p.z, p.y, cos(yaw) * p.z - sin(yaw) * p.x);
}
`;
const normal = `objectNormal = mix(objectNormal, audienceTurn(objectNormal), aHead.w);`;
/** The head turn about the top of the neck, then a sway of a few millimetres that grows from the lap to the head. */
const move = `
transformed = mix(transformed, aHead.xyz + audienceTurn(transformed - aHead.xyz), aHead.w);
float audienceRise = smoothstep(0.1, 0.8, transformed.y);
transformed.x += 0.005 * audienceRise * sin(uTime * 0.7 + aLook.w * 6.2832);
transformed.z += 0.003 * audienceRise * sin(uTime * 1.3 + aLook.w * 40.0);
`;
/** The colour of the vertex's mask (the instance colour is the top), times the vertex's shade. */
const colour = `
#ifdef USE_INSTANCING_COLOR
if (aPart.x > 3.5) vColor.rgb = vec3(0.012);
else if (aPart.x > 2.5) vColor.rgb = uLegs[int(aLook.z + 0.5)];
else if (aPart.x > 1.5) vColor.rgb = uHair[int(aLook.y + 0.5)];
else if (aPart.x > 0.5) vColor.rgb = uSkin[int(aLook.x + 0.5)];
vColor.rgb *= aPart.y;
#endif
`;
const after = (source: string, chunk: string, code: string): string =>
  source.replace(`#include <${chunk}>`, `#include <${chunk}>\n${code}`);

/** `source`, a three.js vertex shader, with the audience's head turn, sway, turned normals and part colours. */
export function audienceVertexShader(source: string): string {
  return pars + after(after(after(source, 'beginnormal_vertex', normal), 'begin_vertex', move), 'color_vertex', colour);
}

/** Makes `material` draw an audience mesh as the audience material does: same vertices, normals and colours. */
export function patchAudience<T extends Material>(material: T, uniforms: AudienceUniforms): T {
  const palette = (list: readonly number[]): IUniform<Color[]> => ({ value: list.map((hex) => new Color(hex)) });
  const palettes = { uSkin: palette(SKINS), uHair: palette(HAIRS), uLegs: palette(TROUSERS) };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, palettes, uniforms);
    shader.vertexShader = audienceVertexShader(shader.vertexShader);
  };
  // Three shares programs between materials of one type; the key keeps a patched material apart from a plain one.
  material.customProgramCacheKey = () => 'audience';
  return material;
}

/** The audience material: matte opaque standard shading with no emissive, lit like every other object. */
export const audienceMaterial = (uniforms: AudienceUniforms): MeshStandardMaterial =>
  patchAudience(new MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, metalness: 0 }), uniforms);

const passes = new WeakMap<Material, Material>();

/**
 * FOR A PASS THAT DRAWS THE SCENE WITH AN OVERRIDE MATERIAL (depth, normals, albedo): draw an audience mesh with
 * `mesh.userData.audiencePass(override)` in place of `override`. It is a clone of `override` with the audience's
 * vertex code, made once per override material and disposed with it, so heads and sway match the lit picture and
 * the albedo is the figure's. The override must be built from three.js shader chunks (`begin_vertex`, `beginnormal_vertex`,
 * `color_vertex`), and uniforms it changes per frame must be shared objects, as a clone copies uniform values.
 */
export function audiencePass(override: Material, uniforms: AudienceUniforms): Material {
  const known = passes.get(override);
  if (known) return known;
  const made = patchAudience(override.clone(), uniforms);
  passes.set(override, made);
  // the clone has a program of its own, which only its own dispose frees
  override.addEventListener('dispose', () => made.dispose());
  return made;
}
