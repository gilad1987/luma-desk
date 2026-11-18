import { vi, type Mock } from 'vitest';
import type { Rig } from '../../../src/domain/rig/Rig';
import { rigFromDesign } from '../../../src/domain/stage/deriveRig';
import type { StageDesign } from '../../../src/domain/stage/StageDesign';
import { frameOf, type StageFrame } from '../../../src/domain/stage/StageFrame';
import { BUILT_IN_DESIGN } from '../../../src/domain/stage/templates/sultansPool/builtInDesign';
import type { RigChangeCause } from '../../../src/engine/stage/rigChanged';

/** The fake stage of the MVR flow tests; it also reads as the wiring's stage, which adds the last apply's cause. */
export interface FakeMvrStage {
  design: StageDesign;
  cause: RigChangeCause;
  readonly builtIn: StageDesign;
  readonly rig: Rig;
  readonly frame: StageFrame;
  readonly isBuiltIn: boolean;
  readonly apply: Mock;
  readonly updateMeta: Mock;
}

/** A stage on `design` whose apply and updateMeta record into `calls`; rig and frame follow the current design. */
export function fakeMvrStage(design: StageDesign, calls: string[]): FakeMvrStage {
  const stage = {
    design,
    builtIn: BUILT_IN_DESIGN,
    cause: 'boot' as RigChangeCause,
    get rig(): Rig {
      return rigFromDesign(stage.design);
    },
    get frame(): StageFrame {
      return frameOf(stage.design);
    },
    get isBuiltIn(): boolean {
      return stage.design === BUILT_IN_DESIGN;
    },
    apply: vi.fn((next: StageDesign, cause: RigChangeCause) => {
      calls.push('apply');
      stage.design = next;
      stage.cause = cause;
    }),
    updateMeta: vi.fn((next: StageDesign) => {
      calls.push('updateMeta');
      stage.design = next;
    }),
  };
  return stage;
}
