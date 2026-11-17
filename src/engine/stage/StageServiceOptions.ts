import type { StageDesign } from '../../domain/stage/StageDesign';

/** What main.ts gives the service at boot. */
export interface StageServiceOptions {
  /** The stage of the original desk; `isBuiltIn` compares with this object by identity. */
  readonly builtIn: StageDesign;
  /** The stage saved in the show, if any; without one the service starts on `builtIn`. */
  readonly initial?: StageDesign | undefined;
  /** The toast text for a rig above `FIXTURE_SOFT_LIMIT`; injected because the engine holds no UI language. */
  readonly tooManyFixtures: (n: number) => string;
}
