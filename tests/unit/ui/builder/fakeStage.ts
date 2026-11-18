import type { StageDesign } from '../../../../src/domain/stage/StageDesign';
import { createTemplate } from '../../../../src/domain/stage/templates';
import type { RigChangeCause } from '../../../../src/engine/stage/rigChanged';
import type { EditorSessionDeps } from '../../../../src/ui/builder/LivePreview';

/** One `apply` call, as the fake stage records it. */
export interface Applied {
  readonly design: StageDesign;
  readonly cause: Exclude<RigChangeCause, 'boot'>;
}

/**
 * The part of `StageService` the builder uses, as plain data: it records every apply and makes the applied design
 * current, as the real service does. `builtIn` is the start design unless the test passes another one.
 */
export function fakeStage(
  design: StageDesign = createTemplate('empty'),
  builtIn: StageDesign = design,
): EditorSessionDeps['stage'] & { readonly applied: Applied[] } {
  const applied: Applied[] = [];
  const stage = {
    design,
    builtIn,
    applied,
    apply: (next: StageDesign, cause: Applied['cause']): void => {
      applied.push({ design: next, cause });
      stage.design = next;
    },
  };
  return stage;
}
