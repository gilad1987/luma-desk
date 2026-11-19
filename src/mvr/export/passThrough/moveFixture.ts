import type { StageFixture } from '../../../domain/stage/StageDesign';
import { bodyShift } from '../../design/bodyShift';
import type { Mat4 } from '../../math/Mat4';
import { restRotation } from '../../math/restRotation';
import type { ExportContext } from '../ExportContext';
import { poseMat4 } from '../poseMatrix';
import { setChildText } from './fixtureChildren';
import { lacksInverse, movedMatrix, samePose } from './movedMatrix';
import type { ParentFrame } from './parentFrame';
import { isIdentity, withoutNoise } from './preciseMatrix';

/** Where the file put one fixture. */
export interface FilePose {
  readonly element: Element;
  /** Fixture to world in the file, every parent applied; absent when the scene walk did not place it. */
  readonly world: Mat4 | undefined;
  /** The parent's frame in the scene as it is written now. */
  readonly parent: ParentFrame;
}

/** What the export did to one fixture's `<Matrix>`. */
export interface MoveEdit {
  /** The desk moved the fixture. */
  readonly moved: boolean;
  /** The `<Matrix>` text changed: for a desk move, or to keep the world pose under a parent that moved. */
  readonly rewritten: boolean;
  /** A new `<Matrix>` was due, but the parent's frame has no inverse, so the text of the file stays. */
  readonly unplaced?: true;
}

const STILL: MoveEdit = { moved: false, rewritten: false };

/**
 * Writes the desk pose when the desk moved the fixture; the same pose keeps the original `<Matrix>` text. The mount
 * shift is the one of the type the import chose: it took the file's insertion point to the desk position, so only the
 * same shift takes it back. With the shift of a new type, a re-type alone moved the insertion point in the file
 * (by 153 mm and 393 mm in a review) though the user moved nothing; a real move now changes it by that move only.
 */
export function moveFixture(file: FilePose, fixture: StageFixture, context: ExportContext): MoveEdit {
  if (!file.world) return STILL;
  const imported = context.design.mvr?.fixtures[String(fixture.id)]?.type;
  const origin = bodyShift(imported ? { ...fixture, type: imported } : fixture, context.design.mvr, 'toMount');
  const pose = poseMat4(origin, fixture.rotation ?? restRotation(fixture.mount), context.offset);
  // Under a parent the local matrix is the text, so `movedMatrix` takes the noise off there and not off the world.
  const next = isIdentity(file.parent.world) ? withoutNoise(pose) : pose;
  const text = movedMatrix(file.world, next, file.parent);
  if (text === undefined && lacksInverse(file.world, next, file.parent)) return { ...STILL, unplaced: true };
  if (text === undefined || !setChildText(file.element, 'Matrix', text)) return STILL;
  return { moved: !samePose(file.world, next), rewritten: true };
}
