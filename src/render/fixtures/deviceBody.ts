import { BoxGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, type Object3D } from 'three';
import type { Fixture } from '../../domain/Fixture';
import type { FixtureBody } from './fixtureBody';
import type { GdtfBuilt } from './gdtf/buildGdtfBody';

/** The side of the device box in metres: about a hazer or a chain hoist, small enough not to read as a light. */
const DEVICE_SIDE = 0.3;

/** The group of a device at the fixture position and the box in it, which is also the pick target. */
export interface DeviceBody {
  readonly g: Group;
  readonly box: Mesh<BoxGeometry, MeshStandardMaterial>;
  /** The material of the visible body (the box, or the GDTF body): the frame update tints it when selected. */
  readonly bodyMat: MeshStandardMaterial;
  /** The lens material a GDTF body builds with; it never glows, because a device emits no light. */
  readonly lensMat: MeshBasicMaterial;
  /** The meshes of the GDTF body; empty when the device is drawn as the box. */
  readonly pick: readonly Mesh[];
}

/**
 * Builds the body of a `device` fixture (a hoist, a hazer, a speaker) with no lens glow, beam, pool or light,
 * because the device emits no light. `real` builds its GDTF body, the same path a light takes; without one, a
 * neutral grey box marks the place. With one, the box stays as an invisible pick target (`visible = false` on its
 * own material keeps it pickable) so the body is not hidden in a grey cube.
 */
export function createDeviceBody(
  f: Fixture,
  scene: Object3D,
  real?: (c: FixtureBody) => Pick<GdtfBuilt, 'pick'>,
): DeviceBody {
  const g = new Group();
  g.position.copy(f.pos);
  if (f.rotation) g.quaternion.copy(f.rotation);
  const bodyMat = new MeshStandardMaterial({ color: 0x3a3d44, metalness: 0.2, roughness: 0.7, emissive: 0x000000 });
  const lensMat = new MeshBasicMaterial({ color: 0x050505, side: DoubleSide, toneMapped: false });
  const pivot = new Group();
  g.add(pivot);
  const pick = real?.({ g, bodyMat, lensMat, floor: false, pivot, mount: null }).pick ?? [];
  const boxMat = real ? new MeshStandardMaterial({ visible: false }) : bodyMat;
  const box = new Mesh(new BoxGeometry(DEVICE_SIDE, DEVICE_SIDE, DEVICE_SIDE), boxMat);
  g.add(box);
  scene.add(g);
  return { g, box, bodyMat, lensMat, pick };
}
