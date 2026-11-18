import type { Linter } from 'eslint';
import { restrictDynamicImports, type ImportRestriction } from './dynamicImports.ts';
import { HEBREW_TEXT } from './i18nRules.ts';
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

const THREE_ADDONS: ImportRestriction = {
  regex: '^three/(addons|examples)(/|$)',
  message: 'three/addons are render-only: domain and engine may use the three core math types alone.',
};
/** `three` and every subpath, as the old `three` glob matched: core imports no part of the library. */
const THREE_CORE: ImportRestriction = { regex: '^three(/|$)', message: 'core is pure helpers and imports no library.' };

/** The three.js imports a layer must not use: core uses no library, domain and engine only the core math types. */
function forbiddenThree(layer: Layer): ImportRestriction[] {
  if (layer === 'core') return [THREE_CORE, THREE_ADDONS];
  if (layer === 'domain' || layer === 'engine') return [THREE_ADDONS];
  return [];
}

/**
 * `src/app` is the composition root's wiring: only `src/main.ts` and `src/app` itself may import it. A file reaches it
 * through relative steps (`./app`, `../app`, `./../app`) or through the src folder (`../../src/app`); the regex covers
 * all of them. It is a regex, not a glob, because the old glob also matched package paths such as `firebase/app`. No
 * other src folder is named `app`.
 */
const APP_WIRING: ImportRestriction = {
  regex: '^(\\.{1,2}/)+(src/)?app(/|$)',
  message: 'Only src/main.ts and src/app may import src/app.',
};

/** A layer folder as any segment of the path, so `../engine`, `./../engine/x` and `../../src/engine/x` all match. */
function layerRestriction(layer: Layer, name: Layer): ImportRestriction {
  return { regex: `(^|/)${name}(/|$)`, message: `${layer} must not import ${name}: see the layer rules in docs/plan.` };
}

/** The locale is the one folder that rule I1 lets hold Hebrew text. */
function hebrewTextRule(layer: Layer): typeof HEBREW_TEXT {
  return layer === 'i18n' ? [] : HEBREW_TEXT;
}

/**
 * Rules for one layer. A later entry for a rule replaces the earlier one, so it repeats the shared-folder rule of
 * no-restricted-imports and the Hebrew text rule of no-restricted-syntax.
 */
function layerBlock(layer: Layer, forbidden: readonly Layer[]): Linter.Config {
  const layers = forbidden.map((name) => layerRestriction(layer, name));
  const restrictions = [APP_WIRING, ...layers, ...forbiddenThree(layer)];
  return {
    files: [`src/${layer}/**/*.ts`],
    rules: {
      'no-restricted-imports': ['error', { patterns: [SHARED_INTERNALS, ...restrictions] }],
      'no-restricted-syntax': ['error', ...hebrewTextRule(layer), ...restrictDynamicImports(restrictions)],
    },
  };
}

/**
 * Every src folder outside the wiring; the layer blocks after it replace it for their own folders, which is how
 * src/i18n loses the Hebrew text rule again.
 */
const appWiringBlock: Linter.Config = {
  files: ['src/**/*.ts'],
  ignores: ['src/main.ts', 'src/app/**'],
  rules: {
    'no-restricted-imports': ['error', { patterns: [SHARED_INTERNALS, APP_WIRING] }],
    'no-restricted-syntax': ['error', ...HEBREW_TEXT, ...restrictDynamicImports([APP_WIRING])],
  },
};

/** The wiring block, then one config block per layer that has import limits, from the FORBIDDEN_LAYERS table. */
export const layerRules: Linter.Config[] = [
  appWiringBlock,
  ...Object.entries(FORBIDDEN_LAYERS).map(([layer, forbidden]) => layerBlock(layer as Layer, forbidden)),
];
