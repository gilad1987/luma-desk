import { vi, type Mock } from 'vitest';
import type { MvrFlowDeps } from '../../../src/app/mvr/MvrFlowDeps';
import type { ShowAfterImport } from '../../../src/app/mvr/mvrShow';
import { Rig } from '../../../src/domain/rig/Rig';
import type { StageDesign } from '../../../src/domain/stage/StageDesign';
import { BUILT_IN_DESIGN } from '../../../src/domain/stage/templates/sultansPool/builtInDesign';
import type { MeshFailure } from '../../../src/render/mvr/MeshLibrary';
import type { MvrStageInput } from '../../../src/render/mvr/MvrStage';
import { fakeMvrStage, type FakeMvrStage } from './fakeMvrStage';

/** The spies of `fakeMvrFlowDeps`; `calls` names each stage, scenery, prompt, modal and toast call in order. */
export interface FakeMvrFlow {
  readonly deps: MvrFlowDeps;
  readonly calls: string[];
  readonly toasts: string[];
  readonly stage: FakeMvrStage;
  readonly scenery: { load: Mock<() => Promise<void>>; show: Mock<(input: MvrStageInput) => Promise<MeshFailure[]>> };
  readonly sceneryHide: Mock<(uuids: readonly string[]) => void>;
  readonly prompt: { readonly show: Mock<(name: string) => void>; readonly hide: Mock };
  readonly modal: { readonly open: Mock; readonly close: Mock; isOpen: Mock<() => boolean> };
  readonly store: { get: Mock<() => Promise<Uint8Array | null>>; put: Mock<() => Promise<string | null>> };
  readonly firstLook: Mock; // `show.afterImport`, kept out of `calls` so the recorded flow orders stay as they are
}

/** A store that keeps every file under the hash `hash` and holds nothing. */
const emptyStore = () => ({
  get: vi.fn(() => Promise.resolve<Uint8Array | null>(null)),
  hashOf: vi.fn(() => Promise.resolve<string | null>('hash')),
  has: vi.fn(() => Promise.resolve<boolean | undefined>(false)),
  put: vi.fn(() => Promise.resolve<string | null>('hash')),
  delete: vi.fn(() => Promise.resolve(true)),
});

/** A scenery that loads and draws every mesh and records each call into `calls`. */
const fakeScenery = (calls: string[]) => ({
  load: vi.fn(() => Promise.resolve(void calls.push('load'))),
  show: vi.fn((_input: MvrStageInput) => {
    calls.push('show');
    return Promise.resolve<MeshFailure[]>([]);
  }),
});

/**
 * `MvrFlowDeps` over spies, for the MVR flow tests. The stage starts on `design`, a closed modal, a store that keeps
 * every file under the hash `hash` and holds nothing, and a scenery that loads and draws every mesh.
 */
export function fakeMvrFlowDeps(design: StageDesign = BUILT_IN_DESIGN): FakeMvrFlow {
  const calls: string[] = [];
  const toasts: string[] = [];
  const named = (name: string): Mock => vi.fn(() => void calls.push(name));
  const stage = fakeMvrStage(design, calls);
  const scenery = fakeScenery(calls);
  const sceneryHide = vi.fn((_uuids: readonly string[]) => void calls.push('setHiddenLayers'));
  const prompt = { show: vi.fn((_name: string) => void calls.push('prompt.show')), hide: named('prompt.hide') };
  const modal = { open: named('modal.open'), close: named('modal.close'), isOpen: vi.fn(() => false) };
  const store = emptyStore();
  const toast = (text: string): void => {
    calls.push('toast');
    toasts.push(text);
  };
  const fullScenery = { ...scenery, setHiddenLayers: sceneryHide, dispose: named('dispose') };
  const firstLook = vi.fn((): ShowAfterImport => 'built');
  const show = { before: vi.fn(() => ({ rig: new Rig([]), starting: true })), afterDemoRig: vi.fn(), build: vi.fn() };
  const flowParts = { stage, store, scenery: fullScenery, prompt, toast, modal: () => modal };
  const deps: MvrFlowDeps = {
    ...flowParts,
    bodies: { show: vi.fn(() => Promise.resolve([])) },
    cancelBuilder: named('cancelBuilder'),
    show: { ...show, afterImport: firstLook },
  };
  return { deps, calls, toasts, stage, scenery, sceneryHide, prompt, modal, store, firstLook };
}
