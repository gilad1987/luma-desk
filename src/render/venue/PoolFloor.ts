import { MeshStandardMaterial, PlaneGeometry, RepeatWrapping, SRGBColorSpace, type Object3D } from 'three';
import { AUDIENCE_TERRAIN } from '../../domain/audienceTerrain';
import { STAGE } from '../../domain/venue';
import { addMesh, createCanvasTexture, drawCanvas } from '../shared';

/** Sandy stone paving: a warm base with random flecks; uses `Math.random` 5 times per fleck. */
function paintPaving(x: CanvasRenderingContext2D): void {
  x.fillStyle = '#5a5246';
  x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9000; i++) {
    const v = 60 + Math.random() * 60;
    x.fillStyle = `rgba(${v},${v * 0.92},${v * 0.8},.25)`;
    x.fillRect(Math.random() * 512, Math.random() * 512, 2 + Math.random() * 3, 2 + Math.random() * 3);
  }
}

/** Builds the flat pool floor between the stage and the terraces, where the standing crowd and chairs are. */
export function buildPoolFloor(scene: Object3D): void {
  const paving = createCanvasTexture(drawCanvas(512, 512, paintPaving), {
    colorSpace: SRGBColorSpace,
    wrap: RepeatWrapping,
    repeat: [14, 14],
  });
  const floor = addMesh(
    scene,
    new PlaneGeometry(AUDIENCE_TERRAIN.X * 2, AUDIENCE_TERRAIN.Z1 - STAGE.z0 + 10),
    new MeshStandardMaterial({ color: 0x8a8070, map: paving, roughness: 0.95 }),
    { position: [0, 0.01, (AUDIENCE_TERRAIN.Z1 + STAGE.z0 - 10) / 2], rotation: [-Math.PI / 2, 0, 0] },
  );
  floor.receiveShadow = true;
}
