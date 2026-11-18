// @vitest-environment jsdom
/**
 * The frame chain of a placement, checked against the import's own numbers: a mesh loaded by three and placed by
 * MvrStage must cover the same world box as the import's mesh bounds moved by the placement matrix, C and the fit
 * offset. A 90° turn keeps boxes exact, so the two boxes must agree to float precision. Two placements of one file
 * take the InstancedMesh path, which must give the union of both boxes.
 */
import { Box3, BoxGeometry, InstancedMesh, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { describe, expect, it } from 'vitest';
import { MvrArchive } from '../../../../src/mvr/archive/MvrArchive.ts';
import { importMvr } from '../../../../src/mvr/index.ts';
import { shiftBox, transformBox } from '../../../../src/mvr/math/Aabb.ts';
import { boxToThree } from '../../../../src/mvr/math/axes.ts';
import { meshBounds } from '../../../../src/mvr/mesh/meshBounds.ts';
import { MvrStage } from '../../../../src/render/mvr/MvrStage.ts';
import { make3ds, meshScene } from '../../../shared/index.ts';

/** A 90° turn about MVR Z and a move in millimetres. */
const TURNED = '{0,1,0}{-1,0,0}{0,0,1}{1500,-2500,300}';
/** Unturned, a few metres away from `TURNED`, so two placements of one file span a box neither covers alone. */
const MOVED = '{1,0,0}{0,1,0}{0,0,1}{-4000,1000,0}';

/** The box the import's numbers give, the box MvrStage draws, and the stage that drew it. */
interface Boxes {
  readonly expected: Box3;
  readonly drawn: Box3;
  readonly stage: MvrStage;
}

async function offCentreGlb(): Promise<Uint8Array> {
  const mesh = new Mesh(new BoxGeometry(2, 1, 0.5).translate(0.3, 0.5, -0.1), new MeshStandardMaterial());
  const glb = await new GLTFExporter().parseAsync(mesh, { binary: true });
  if (!(glb instanceof ArrayBuffer)) throw new TypeError('GLTFExporter gave no binary glTF');
  return new Uint8Array(glb);
}

/** The world box the import's numbers give for the placements of `file`, one per matrix, and the box MvrStage draws. */
async function bothBoxes(file: string, bytes: Uint8Array, matrices: readonly string[] = [TURNED]): Promise<Boxes> {
  const mvr = meshScene(
    matrices.map((matrix) => ({ file, matrix })),
    { [file]: bytes },
  );
  const { design, geometry, meshes, meshResources } = await importMvr(mvr, { name: 'frames' });
  const local = meshBounds(MvrArchive.open(mvr), file, () => undefined);
  if (!local || geometry.placements.length !== matrices.length) throw new Error(`frames: ${file} gave no bounds`);
  const expected = new Box3();
  for (const placement of geometry.placements) {
    const { min, max } = shiftBox(boxToThree(transformBox(local, placement.matrix)), geometry.offset);
    expected.union(new Box3(new Vector3(...min), new Vector3(...max)));
  }
  const stage = new MvrStage();
  await stage.show({ design, geometry, meshes, meshResources });
  return { expected, drawn: new Box3().setFromObject(stage.group, true), stage };
}

function expectSameBox({ expected, drawn }: Boxes): void {
  drawn.min.toArray().forEach((value, axis) => expect(value).toBeCloseTo(expected.min.getComponent(axis), 5));
  drawn.max.toArray().forEach((value, axis) => expect(value).toBeCloseTo(expected.max.getComponent(axis), 5));
}

describe('MvrStage placement frames', () => {
  it('places a glTF mesh (m, Y up) where the import bounds say', async () => {
    expectSameBox(await bothBoxes('box.glb', await offCentreGlb()));
  });

  it('places both instances of a glTF mesh two placements share where the import bounds say', async () => {
    const boxes = await bothBoxes('box.glb', await offCentreGlb(), [TURNED, MOVED]);
    expect(boxes.stage.group.getObjectsByProperty('isInstancedMesh', true)).toHaveLength(1);
    expect(boxes.stage.group.getObjectsByProperty('isInstancedMesh', true)[0]).toBeInstanceOf(InstancedMesh);
    expectSameBox(boxes);
  });

  it('places a 3DS mesh (mm, Z up) where the import bounds say', async () => {
    const tds = make3ds([
      [0, 0, 0],
      [1000, 2000, 500],
      [-200, 100, 1500],
    ]);
    expectSameBox(await bothBoxes('box.3ds', tds));
  });

  it('treats a file without extension as 3DS, as the import does', async () => {
    expectSameBox(
      await bothBoxes(
        'chair',
        make3ds([
          [0, 0, 0],
          [400, 450, 900],
        ]),
      ),
    );
  });
});
