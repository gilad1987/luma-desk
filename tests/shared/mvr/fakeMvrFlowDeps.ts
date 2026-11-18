import { vi, type Mock } from 'vitest';
import type { MvrFlowDeps } from '../../../src/app/mvr/MvrFlowDeps';
import type { StageDesign } from '../../../src/domain/stage/StageDesign';
import { BUILT_IN_DESIGN } from '../../../src/domain/stage/templates/sultansPool/builtInDesign';
import type { MeshFailure } from '../../../src/render/mvr/MeshLibrary';
import type { MvrStageInput } from '../../../src/render/mvr/MvrStage';

/** The spies of `fakeMvrFlowDeps`; `calls` names each stage, scenery, prompt, modal and toast call in order. */
export interface FakeMvrFlow {
  readonly deps: MvrFlowDeps;
  readonly calls: string[];
  readonly toasts: string[];
  readonly stage: { design: StageDesign; readonly apply: Mock; readonly updateMeta: Mock };
  readonly scenery: { load: Mock<() => Promise<void>>; show: Mock<(input: MvrStageInput) => Promise<MeshFailure[]>> };
  readonly sceneryHide: Mock<(uuids: readonly string[]) => void>;
  readonly prompt: { readonly show: Mock<(name: string) => void>; readonly hide: Mock };
  readonly modal: { readonly open: Mock; readonly close: Mock; isOpen: Mock<() => boolean> };
  readonly store: { get: Mock<() => Promise<Uint8Array | null>>; put: Mock<() => Promise<string | null>> };
}

/** A store that keeps every file under the hash `hash` and holds nothing. */
const emptyStore = () => ({
  get: vi.fn(() => Promise.resolve<Uint8Array | null>(null)),
  put: vi.fn(() => Promise.resolve<string | null>('hash')),
  delete: vi.fn(() => Promise.resolve(true)),
});

/**
 * `MvrFlowDeps` over spies, for the MVR flow tests. The stage starts on `design`, a closed modal, a store that keeps
 * every file under the hash `hash` and holds nothing, and a scenery that loads and draws every mesh.
 */
export function fakeMvrFlowDeps(design: StageDesign = BUILT_IN_DESIGN): FakeMvrFlow {
  const calls: string[] = [];
  const toasts: string[] = [];
  const named = (name: string): Mock => vi.fn(() => void calls.push(name));
  const stage = {
    design,
    builtIn: BUILT_IN_DESIGN,
    apply: vi.fn((next: StageDesign) => {
      calls.push('apply');
      stage.design = next;
    }),
    updateMeta: vi.fn((next: StageDesign) => {
      calls.push('updateMeta');
      stage.design = next;
    }),
  };
  const scenery = {
    load: vi.fn(() => {
      calls.push('load');
      return Promise.resolve();
    }),
    show: vi.fn((_input: MvrStageInput) => {
      calls.push('show');
      return Promise.resolve<MeshFailure[]>([]);
    }),
  };
  const sceneryHide = vi.fn((_uuids: readonly string[]) => void calls.push('setHiddenLayers'));
  const prompt = { show: vi.fn((_name: string) => void calls.push('prompt.show')), hide: named('prompt.hide') };
  const modal = { open: named('modal.open'), close: named('modal.close'), isOpen: vi.fn(() => false) };
  const store = emptyStore();
  const toast = (text: string): void => {
    calls.push('toast');
    toasts.push(text);
  };
  const fullScenery = { ...scenery, setHiddenLayers: sceneryHide, dispose: named('dispose') };
  const deps: MvrFlowDeps = { stage, store, scenery: fullScenery, prompt, toast, modal: () => modal };
  return { deps, calls, toasts, stage, scenery, sceneryHide, prompt, modal, store };
}
