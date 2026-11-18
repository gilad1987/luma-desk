// @vitest-environment jsdom
/**
 * The frame chain of a placement, checked against the import's own numbers: a mesh loaded by three and placed by
 * MvrStage must cover the same world box as the import's mesh bounds moved by the placement matrix, C and the fit
 * offset. A 90° turn keeps boxes exact, so the two boxes must agree to float precision.
 */
import { Box3, BoxGeometry, Mesh, MeshStandardMaterial } from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { describe, expect, it } from 'vitest';
import { MvrArchive } from '../../../../src/mvr/archive/MvrArchive.ts';
import { importMvr } from '../../../../src/mvr/index.ts';
import { shiftBox, transformBox, type Aabb } from '../../../../src/mvr/math/Aabb.ts';
import { boxToThree } from '../../../../src/mvr/math/axes.ts';
import { meshBounds } from '../../../../src/mvr/mesh/meshBounds.ts';
import { MvrStage } from '../../../../src/render/mvr/MvrStage.ts';
import { make3ds, meshScene } from '../../../shared/index.ts';

/** A 90° turn about MVR Z and a move in millimetres. */
const TURNED = '{0,1,0}{-1,0,0}{0,0,1}{1500,-2500,300}';

async function offCentreGlb(): Promise<Uint8Array> {
  const mesh = new Mesh(new BoxGeometry(2, 1, 0.5).translate(0.3, 0.5, -0.1), new MeshStandardMaterial());
  const glb = await new GLTFExporter().parseAsync(mesh, { binary: true });
  if (!(glb instanceof ArrayBuffer)) throw new TypeError('GLTFExporter gave no binary glTF');
  return new Uint8Array(glb);
}

/** The world box the import's numbers give for the one placement of `mvr`, and the box MvrStage draws. */
async function bothBoxes(file: string, bytes: Uint8Array): Promise<{ expected: Aabb; drawn: Box3 }> {
  const mvr = meshScene([{ file, matrix: TURNED }], { [file]: bytes });
  const { design, geometry, meshes } = await importMvr(mvr, { name: 'frames' });
  const [placement] = geometry.placements;
  const local = meshBounds(MvrArchive.open(mvr), file, () => undefined);
  if (!placement || !local) throw new Error(`frames: ${file} gave no placement or no bounds`);
  const expected = shiftBox(boxToThree(transformBox(local, placement.matrix)), geometry.offset);
  const stage = new MvrStage();
  await stage.show({ design, geometry, meshes });
  return { expected, drawn: new Box3().setFromObject(stage.group, true) };
}

function expectSameBox({ expected, drawn }: { expected: Aabb; drawn: Box3 }): void {
  drawn.min.toArray().forEach((value, axis) => expect(value).toBeCloseTo(expected.min[axis] ?? NaN, 5));
  drawn.max.toArray().forEach((value, axis) => expect(value).toBeCloseTo(expected.max[axis] ?? NaN, 5));
}

describe('MvrStage placement frames', () => {
  it('places a glTF mesh (m, Y up) where the import bounds say', async () => {
    expectSameBox(await bothBoxes('box.glb', await offCentreGlb()));
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
