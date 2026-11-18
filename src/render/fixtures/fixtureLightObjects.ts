import {
  AdditiveBlending,
  Mesh,
  MeshBasicMaterial,
  Sprite,
  SpriteMaterial,
  Vector3,
  type BoxGeometry,
  type CylinderGeometry,
  type Object3D,
  type PlaneGeometry,
  type ShaderMaterial,
} from 'three';
import type { Fixture } from '../../domain/Fixture';
import { createBeamMaterial, createBeamUniforms, type BeamShared, type BeamUniforms } from './BeamMaterial';
import type { GoboAtlas } from './GoboAtlas';
import type { ModelPrimitives } from './ModelPrimitives';

/** The scene-level light objects of one fixture; they live in world space, outside the fixture group. */
export interface FixtureLightObjects {
  readonly pix: Mesh<BoxGeometry, MeshBasicMaterial> | null;
  readonly uniforms: BeamUniforms;
  readonly beam: Mesh<CylinderGeometry, ShaderMaterial>;
  readonly pool: Mesh<PlaneGeometry, MeshBasicMaterial>;
  readonly glow: Sprite;
}

/** Shared inputs for {@link createFixtureLightObjects}. */
export interface LightObjectKit {
  readonly scene: Object3D;
  readonly prims: ModelPrimitives;
  readonly beam: BeamShared;
  readonly gobo: GoboAtlas;
}

const X_AXIS = new Vector3(1, 0, 0);

/** The pixel bar along the fixture's strip (when it has one), then the beam volume, floor pool and lens glow. */
export function createFixtureLightObjects(f: Fixture, kit: LightObjectKit): FixtureLightObjects {
  const { scene } = kit;
  let pix: Mesh<BoxGeometry, MeshBasicMaterial> | null = null;
  if (f.pix) {
    pix = new Mesh(kit.prims.boxGeo, new MeshBasicMaterial({ color: 0x000000, toneMapped: false }));
    pix.position.copy(f.pix.p);
    pix.quaternion.setFromUnitVectors(X_AXIS, f.pix.tan);
    pix.scale.set(f.pix.len, 0.07, 0.07);
    scene.add(pix);
  }
  const uniforms = createBeamUniforms(kit.beam, f.T.soft ?? 1.6);
  const beam = new Mesh(kit.beam.geometry, createBeamMaterial(uniforms));
  beam.frustumCulled = false;
  scene.add(beam);
  const pool = new Mesh(
    kit.prims.poolGeo,
    new MeshBasicMaterial({
      map: kit.gobo.textures[0],
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      fog: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    }),
  );
  scene.add(pool);
  const glow = new Sprite(
    new SpriteMaterial({
      map: kit.gobo.glow,
      blending: AdditiveBlending,
      depthWrite: false,
      transparent: true,
      fog: false,
    }),
  );
  scene.add(glow);
  return { pix, uniforms, beam, pool, glow };
}
