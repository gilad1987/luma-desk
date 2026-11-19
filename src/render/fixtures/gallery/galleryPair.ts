import { CylinderGeometry, Group, Mesh, MeshStandardMaterial, Vector3, type Box3, type Object3D } from 'three';
import { Fixture } from '../../../domain/Fixture';
import { PRODUCTS, type ProductId } from '../../../domain/fixtureProducts';
import type { LightVisual } from '..';
import { createLightBuilder } from './createLightBuilder';
import { measureVisible } from './measureVisible';

/** The product and its base type's native model, each hung from the pipe and standing on the floor. */
export interface GalleryPair {
  /** Both rows; the camera frames what is visible in it. */
  readonly root: Group;
  /** The hung row with its pipe. */
  readonly hung: Group;
  readonly floor: Group;
  /** Product hung, native hung, product on the floor, native on the floor. */
  readonly visuals: readonly LightVisual[];
}

/** Clear air between the floor row's top and the hung row's bottom, in metres. */
const ROW_GAP_M = 0.5;
/** A 48 mm truss pipe. */
const PIPE_RADIUS_M = 0.024;

/**
 * Builds the four bodies with the desk's own builder (`createLightBuilder`). The beam, pool and glow each fixture
 * also gets stay in a hidden group: the gallery checks bodies and lenses, not beams. `turn` (radians) turns every
 * body about the vertical before placement, so the side view shows both profiles next to each other, not one behind
 * the other.
 */
export function buildGalleryPair(scene: Object3D, product: ProductId, turn: number): GalleryPair {
  const stash = new Group();
  stash.visible = false;
  scene.add(stash);
  const build = createLightBuilder(stash);
  const type = PRODUCTS[product].base;
  const mounts = ['hang', 'hang', 'floor', 'floor'] as const;
  const visuals = mounts.map((mount, i) => {
    const pos = new Vector3();
    const v = build(new Fixture({ id: i + 1, type, pos, mount, fixed: null, product: i % 2 ? undefined : product }));
    v.g.rotation.y = turn; // Euler XYZ: after a floor mover's flip about Z, so it turns about the world vertical
    return v;
  });
  const root = new Group(),
    hung = new Group(),
    floor = new Group();
  root.add(hung, floor);
  scene.add(root);
  placeRows(visuals, hung, floor);
  return { root, hung, floor, visuals };
}

/**
 * Product in the left column, native in the right, a quarter of the wider column apart; the floor row stands on
 * y = 0 and the hung row hangs with every top at the pipe. Measured at the rest pose, before any pan or tilt.
 */
function placeRows(visuals: readonly LightVisual[], hung: Group, floor: Group): void {
  const items = visuals.map((v, i) => ({ v, box: measureVisible(v.g), column: i % 2, isHung: i < 2 }));
  const extent = (pick: (box: Box3) => number, keep: (item: (typeof items)[number]) => boolean): number =>
    Math.max(...items.filter(keep).map((item) => pick(item.box)));
  const width = (column: number): number =>
    extent(
      (box) => box.max.x - box.min.x,
      (item) => item.column === column,
    );
  const height = (isHung: boolean): number =>
    extent(
      (box) => box.max.y - box.min.y,
      (item) => item.isHung === isHung,
    );
  const gap = Math.max(width(0), width(1)) / 4;
  const columnX = [-(gap + width(0)) / 2, (gap + width(1)) / 2];
  const pipeY = height(false) + ROW_GAP_M + height(true);
  for (const { v, box, column, isHung } of items) {
    (isHung ? hung : floor).add(v.g);
    v.g.position.x += (columnX[column] ?? 0) - (box.min.x + box.max.x) / 2;
    v.g.position.y += isHung ? pipeY - box.max.y : -box.min.y;
    v.g.position.z -= (box.min.z + box.max.z) / 2;
  }
  const length = width(0) + width(1) + gap * 3;
  const pipe = new Mesh(
    new CylinderGeometry(PIPE_RADIUS_M, PIPE_RADIUS_M, length, 20),
    new MeshStandardMaterial({ color: 0x9a9ca0, metalness: 0.6, roughness: 0.4 }),
  );
  pipe.rotation.z = Math.PI / 2;
  pipe.position.set((width(1) - width(0)) / 2, pipeY + PIPE_RADIUS_M, 0);
  hung.add(pipe);
}
