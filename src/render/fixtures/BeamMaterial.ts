import { AdditiveBlending, Color, CylinderGeometry, DoubleSide, ShaderMaterial } from 'three';
import { beamFragmentShader, beamVertexShader } from '../shaders';

/** A uniform slot that several materials hold by reference, so one write reaches every beam. */
export interface SharedUniform {
  value: number;
}

/**
 * What every beam shares: the haze density and the haze-noise time (one object each, referenced by every beam's
 * uniforms) and the unit cone, open at the base, with its apex at the origin pointing down -Y.
 */
export interface BeamShared {
  readonly haze: SharedUniform;
  readonly time: SharedUniform;
  readonly geometry: CylinderGeometry;
}

/** One beam's shader inputs; `uHaze` and `uTime` are the shared slots of {@link BeamShared}. */
export type BeamUniforms = {
  readonly uColor: { readonly value: Color };
  readonly uInt: SharedUniform;
  readonly uHaze: SharedUniform;
  readonly uGobo: SharedUniform;
  readonly uGRot: SharedUniform;
  readonly uLen: SharedUniform;
  readonly uEnd: SharedUniform;
  readonly uTime: SharedUniform;
  readonly uSoft: SharedUniform;
};

/** Creates the shared beam state; call it once, before any fixture visual. */
export function createBeamShared(): BeamShared {
  return {
    haze: { value: 0.62 },
    time: { value: 0 },
    geometry: new CylinderGeometry(0, 1, 1, 40, 1, true).translate(0, -0.5, 0),
  };
}

/** A beam's own uniforms; `soft` is the edge softness exponent of its fixture type. */
export function createBeamUniforms(shared: BeamShared, soft: number): BeamUniforms {
  return {
    uColor: { value: new Color() },
    uInt: { value: 0 },
    uHaze: shared.haze,
    uGobo: { value: 0 },
    uGRot: { value: 0 },
    uLen: { value: 30 },
    uEnd: { value: 0 },
    uTime: shared.time,
    uSoft: { value: soft },
  };
}

/** The additive, depth-write-free volume material; fog is off because the shader fades with distance itself. */
export function createBeamMaterial(uniforms: BeamUniforms): ShaderMaterial {
  return new ShaderMaterial({
    uniforms,
    vertexShader: beamVertexShader,
    fragmentShader: beamFragmentShader,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    fog: false,
  });
}
