import type { Linter } from 'eslint';
import { APP_WIRING, appWiringBlock } from './appWiring.ts';
import { restrictDynamicImports, type ImportRestriction } from './dynamicImports.ts';
import { HEBREW_TEXT } from './i18nRules.ts';
import { SHARED_INTERNALS } from './sharedInternals.ts';

const FEATURES = ['command', 'show', 'autoshow', 'audio'] as const;
const PRESENTATION = ['render', 'ui', 'io'] as const;
/** Every layer, bottom up; the rules are built in this order. */
const LAYERS = ['i18n', 'core', 'domain', 'engine', 'mvr', ...FEATURES, ...PRESENTATION] as const;
type Layer = (typeof LAYERS)[number];

/**
 * The layers each layer must not import, so dependencies point one way: core <- domain <- engine <- command, show,
 * autoshow, audio; render and ui sit on top of the engine, and ui drives render, never the reverse. mvr is a pure
 * parser on core and domain: it turns a file into data, so only the features and presentation above it may use it.
 * i18n is plain text data that the engine, io and ui read, so it imports no layer.
 */
const FORBIDDEN_LAYERS: Partial<Record<Layer, readonly Layer[]>> = {
  i18n: ['core', 'domain', 'engine', 'mvr', ...FEATURES, ...PRESENTATION],
  core: ['domain', 'engine', 'mvr', ...FEATURES, ...PRESENTATION],
  domain: ['engine', 'mvr', ...FEATURES, ...PRESENTATION],
  engine: ['mvr', ...FEATURES, ...PRESENTATION],
  mvr: ['engine', ...FEATURES, ...PRESENTATION],
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
const THREE_MVR: ImportRestriction = {
  regex: '^three(/|$)',
  message: 'mvr is a pure parser: it gives data, and render draws it with three.',
};

/** The three.js imports each layer must not use; layers not listed may use all of three. */
const FORBIDDEN_THREE: Partial<Record<Layer, readonly ImportRestriction[]>> = {
  core: [THREE_CORE, THREE_ADDONS],
  domain: [THREE_ADDONS],
  engine: [THREE_ADDONS],
  mvr: [THREE_MVR, THREE_ADDONS],
};

/**
 * The deepest file, counted in `../` steps up to `src/`, that gets an exact rule; deeper files share the last rule,
 * which then also matches more `../` steps. The deepest file today needs 4 steps.
 */
const MAX_DEPTH = 6;

/**
 * The exact rules see a layer only in the shortest relative path, so a longer form of the same path is refused:
 * `./../`, a folder step undone by `..`, an empty or `.` step, or a climb out of `src/` and back in.
 */
const SHORTEST_PATH: ImportRestriction = {
  regex: '^\\./\\.\\.|/\\.?/|(^|/)[^./][^/]*/\\.\\.(/|$)|^(\\.\\./)+src/',
  message: 'Write the shortest relative path, so the layer rule can see it.',
};

/**
 * Rules for the files of one layer that sit `depth` folders below `src/`. An import string does not say which folder
 * it reaches, but a file at a known depth reaches `src/` with exactly `depth` `../` steps. So only `../../mvr` from
 * `src/domain/stage/x.ts` is the mvr layer; `./stage/mvr` and `../domain/stage/mvr` are files inside a layer.
 * A later entry for a rule replaces the earlier one, so it repeats the shared-folder, wiring and Hebrew text rules.
 */
function depthRules(layer: Layer, forbidden: readonly Layer[], depth: number): Linter.Config {
  const last = depth === MAX_DEPTH;
  const steps = last ? `{${depth},}` : `{${depth}}`;
  const layers = forbidden.map((name) => ({
    regex: `^(\\.\\./)${steps}${name}(/|$)`,
    message: `${layer} must not import ${name}: see the layer rules in docs/plan.`,
  }));
  const restrictions = [APP_WIRING, SHORTEST_PATH, ...layers, ...(FORBIDDEN_THREE[layer] ?? [])];
  const hebrewText = layer === 'i18n' ? [] : HEBREW_TEXT;
  const folders = '*/'.repeat(depth - 1);
  return {
    files: [last ? `src/${layer}/${folders}**/*.ts` : `src/${layer}/${folders}*.ts`],
    rules: {
      'no-restricted-imports': ['error', { patterns: [SHARED_INTERNALS, ...restrictions] }],
      'no-restricted-syntax': ['error', ...hebrewText, ...restrictDynamicImports(restrictions)],
    },
  };
}

const DEPTHS = Array.from({ length: MAX_DEPTH }, (_, index) => index + 1);

/** The wiring block, then the import rules of every layer that has limits, one config per layer and file depth. */
export const layerRules: Linter.Config[] = [
  appWiringBlock,
  ...LAYERS.flatMap((layer) => {
    const forbidden = FORBIDDEN_LAYERS[layer];
    return forbidden ? DEPTHS.map((depth) => depthRules(layer, forbidden, depth)) : [];
  }),
];
