import type { Linter } from 'eslint';
import { SHARED_INTERNALS } from './sharedInternals.ts';

type Layer = 'core' | 'domain' | 'engine' | 'command' | 'show' | 'autoshow' | 'audio' | 'render' | 'ui' | 'io' | 'i18n';

const FEATURES: readonly Layer[] = ['command', 'show', 'autoshow', 'audio'];
const PRESENTATION: readonly Layer[] = ['render', 'ui', 'io'];

/**
 * The layers each layer must not import, so dependencies point one way: core <- domain <- engine <- command, show,
 * autoshow, audio; render and ui sit on top of the engine, and ui drives render, never the reverse. i18n is plain
 * text data that the engine, io and ui read, so it imports no layer.
 */
const FORBIDDEN_LAYERS: Partial<Record<Layer, readonly Layer[]>> = {
  i18n: ['core', 'domain', 'engine', ...FEATURES, ...PRESENTATION],
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

/**
 * `src/app` is the composition root's wiring: only `src/main.ts` and `src/app` itself may import it. A file under
 * `src/<area>/` reaches it through `../` steps, and a new file directly under `src/` would use `./app`; the regex
 * covers both. It is a regex, not a glob, because the old glob also matched package paths such as `firebase/app`. No
 * other src folder is named `app`.
 */
const APP_WIRING = {
  regex: '^(\\./|(\\.\\./)+)app(/|$)',
  message: 'Only src/main.ts and src/app may import src/app.',
};

/** Rules for one layer; it repeats the shared-folder rule because a later no-restricted-imports entry replaces it. */
function layerBlock(layer: Layer, forbidden: readonly Layer[]): Linter.Config {
  const layers = forbidden.map((name) => ({
    group: [`**/${name}`, `**/${name}/*`],
    message: `${layer} must not import ${name}: see the layer rules in docs/plan.`,
  }));
  return {
    files: [`src/${layer}/**/*.ts`],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [SHARED_INTERNALS, APP_WIRING, ...layers, ...forbiddenThree(layer)] },
      ],
    },
  };
}

/** Every src folder outside the wiring; the layer blocks after it replace it for their own folders. */
const appWiringBlock: Linter.Config = {
  files: ['src/**/*.ts'],
  ignores: ['src/main.ts', 'src/app/**'],
  rules: { 'no-restricted-imports': ['error', { patterns: [SHARED_INTERNALS, APP_WIRING] }] },
};

/** The wiring block, then one config block per layer that has import limits, from the FORBIDDEN_LAYERS table. */
export const layerRules: Linter.Config[] = [
  appWiringBlock,
  ...Object.entries(FORBIDDEN_LAYERS).map(([layer, forbidden]) => layerBlock(layer as Layer, forbidden)),
];
