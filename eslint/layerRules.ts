import type { Linter } from 'eslint';
import { SHARED_INTERNALS } from './sharedInternals.ts';

type Layer = 'core' | 'domain' | 'engine' | 'command' | 'show' | 'autoshow' | 'audio' | 'render' | 'ui' | 'io';

const FEATURES: readonly Layer[] = ['command', 'show', 'autoshow', 'audio'];
const PRESENTATION: readonly Layer[] = ['render', 'ui', 'io'];

/**
 * The layers each layer must not import, so dependencies point one way: core <- domain <- engine <- command, show,
 * autoshow, audio; render and ui sit on top of the engine, and ui drives render, never the reverse.
 */
const FORBIDDEN_LAYERS: Partial<Record<Layer, readonly Layer[]>> = {
  core: ['domain', 'engine', ...FEATURES, ...PRESENTATION],
  domain: ['engine', ...FEATURES, ...PRESENTATION],
  engine: [...FEATURES, ...PRESENTATION],
  command: PRESENTATION,
  show: PRESENTATION,
  autoshow: PRESENTATION,
  audio: PRESENTATION,
  render: ['ui'],
};

const THREE_ADDONS = {
  group: ['three/addons', 'three/addons/*', 'three/examples/*'],
  message: 'three/addons are render-only: domain and engine may use the three core math types alone.',
};
const THREE_CORE = { group: ['three'], message: 'core is pure helpers and imports no library.' };

/** The three.js imports a layer must not use: core uses no library, domain and engine only the core math types. */
function forbiddenThree(layer: Layer): (typeof THREE_CORE)[] {
  if (layer === 'core') return [THREE_CORE, THREE_ADDONS];
  if (layer === 'domain' || layer === 'engine') return [THREE_ADDONS];
  return [];
}

/** Rules for one layer; it repeats the shared-folder rule because a later no-restricted-imports entry replaces it. */
function layerBlock(layer: Layer, forbidden: readonly Layer[]): Linter.Config {
  const layers = forbidden.map((name) => ({
    group: [`**/${name}`, `**/${name}/*`],
    message: `${layer} must not import ${name}: see the layer rules in docs/plan.`,
  }));
  return {
    files: [`src/${layer}/**/*.ts`],
    rules: {
      'no-restricted-imports': ['error', { patterns: [SHARED_INTERNALS, ...layers, ...forbiddenThree(layer)] }],
    },
  };
}

/** One config block per layer that has import limits, built from the FORBIDDEN_LAYERS table. */
export const layerRules: Linter.Config[] = Object.entries(FORBIDDEN_LAYERS).map(([layer, forbidden]) =>
  layerBlock(layer as Layer, forbidden),
);
