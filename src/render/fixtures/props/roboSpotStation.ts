import { Group, MeshBasicMaterial, MeshStandardMaterial, type Object3D } from 'three';
import type { FohRig } from '../../camera/FohRig';
import { addMesh, srgbCanvasTexture } from '../../shared';
import { merge } from '../modelGeometry';
import type { ModelKit } from '../models/ModelContext';

// the follow-spot camera view: blue beams converging on a performer
const paintMonitor = (x: CanvasRenderingContext2D): void => {
  x.fillStyle = '#04081a';
  x.fillRect(0, 0, 128, 72);
  x.fillStyle = '#10142a';
  x.fillRect(0, 54, 128, 18);
  for (let i = 0; i < 6; i++) {
    const bx = 14 + i * 20,
      g = x.createLinearGradient(bx, 0, 64, 60);
    g.addColorStop(0, 'rgba(120,170,255,.9)');
    g.addColorStop(1, 'rgba(60,110,255,0)');
    x.fillStyle = g;
    x.beginPath();
    x.moveTo(bx - 2, 0);
    x.lineTo(bx + 2, 0);
    x.lineTo(64 + (i - 2.5) * 6, 58);
    x.lineTo(64 + (i - 2.5) * 4, 58);
    x.fill();
  }
  x.fillStyle = '#e8eeff';
  x.fillRect(62, 46, 4, 10);
};

/**
 * The RoboSpot BaseStation on a flight case at FOH: pan/tilt handles, fader panel, hooded monitor, clipboard. It
 * stands on the riser in the camera views' `FohRig`, so it hides with the riser in the MA view and stays hidden in
 * a venue without a FOH riser.
 */
export function buildRoboSpotStation(scene: Object3D, { prims }: ModelKit, fohRig: Pick<FohRig, 'addRider'>): void {
  const { box, cylinder, cylinderX } = prims;
  const m = new MeshStandardMaterial({ color: 0x232328, roughness: 0.5, metalness: 0.4 });
  const body = merge([
    box([0, 0.275, 0], [0.7, 0.55, 0.5]),
    box([0, 0.63, 0], [0.62, 0.16, 0.45]),
    cylinder([0, 0.77, 0], 0.14, 0.12),
    box([0, 0.9, 0], [0.5, 0.14, 0.22]),
    box([0, 1.0, 0.05], [0.38, 0.05, 0.2], [0.35, 0, 0]),
    ...[-1, 1].map((sx) => cylinderX([sx * 0.42, 0.9, 0.06], 0.03, 0.34)),
    box([0, 1.12, -0.02], [0.06, 0.14, 0.06]),
    box([0, 1.3, -0.02], [0.62, 0.38, 0.06]),
    box([0, 1.5, 0.09], [0.66, 0.02, 0.24]),
    ...[-1, 1].map((sx) => box([sx * 0.32, 1.3, 0.09], [0.02, 0.38, 0.24])),
    box([-0.55, 1.25, 0.02], [0.26, 0.36, 0.02], [0, 0.35, 0]),
  ]);
  const scr = srgbCanvasTexture(128, 72, paintMonitor);
  const g = new Group();
  g.position.set(3.0, 5.0, 47.3);
  addMesh(g, body, m);
  scene.add(g);
  const sc = addMesh(g, prims.planeGeo, new MeshBasicMaterial({ map: scr }), { position: [0, 1.3, 0.012] });
  sc.scale.set(0.56, 0.32, 1);
  fohRig.addRider(g);
}
