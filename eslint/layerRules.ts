import type { Linter } from 'eslint';

const FEATURES = ['command', 'show', 'autoshow', 'audio'] as const;
const PRESENTATION = ['render', 'ui', 'io'] as const;
/** Every layer, bottom up; the rules are built in this order. */
const LAYERS = ['core', 'domain', 'engine', 'mvr', ...FEATURES, ...PRESENTATION] as const;
type Layer = (typeof LAYERS)[number];

/**
 * The layers each layer must not import, so dependencies point one way: core <- domain <- engine <- command, show,
 * autoshow, audio; render and ui sit on top of the engine, and ui drives render, never the reverse. mvr is a pure
 * parser on core and domain: it turns a file into data, so only the features and presentation above it may use it.
 */
const FORBIDDEN_LAYERS: Partial<Record<Layer, readonly Layer[]>> = {
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

/** Shared folders publish their API through index.ts; reaching past it couples callers to internals. */
export const SHARED_INTERNALS = {
  group: ['**/shared/*', '!**/shared/index', '!**/shared/index.ts'],
  message: 'Import a shared folder through its index.ts.',
};
const THREE_ADDONS = {
  group: ['three/addons', 'three/addons/*', 'three/examples/*'],
  message: 'three/addons are render-only: domain and engine may use the three core math types alone.',
};
const THREE_CORE = { group: ['three'], message: 'core is pure helpers and imports no library.' };
const THREE_MVR = { group: ['three'], message: 'mvr is a pure parser: it gives data, and render draws it with three.' };

/** The three.js imports each layer must not use; layers not listed may use all of three. */
const FORBIDDEN_THREE: Partial<Record<Layer, readonly (typeof THREE_ADDONS)[]>> = {
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
 * Rules for the files of one layer that sit `depth` folders below `src/`. An import string does not say which folder
 * it reaches, but a file at a known depth reaches `src/` with exactly `depth` `../` steps. So only `../../mvr` from
 * `src/domain/stage/x.ts` is the mvr layer; `./stage/mvr` and `../domain/stage/mvr` are files inside a layer.
 * It repeats the shared-folder rule because a later no-restricted-imports entry replaces it.
 */
function depthRules(layer: Layer, forbidden: readonly Layer[], depth: number): Linter.Config {
  const last = depth === MAX_DEPTH;
  const steps = last ? `{${depth},}` : `{${depth}}`;
  const layers = forbidden.map((name) => ({
    regex: `^(\\.\\./)${steps}${name}(/|$)`,
    message: `${layer} must not import ${name}: see the layer rules in docs/plan.`,
  }));
  const folders = '*/'.repeat(depth - 1);
  return {
    files: [last ? `src/${layer}/${folders}**/*.ts` : `src/${layer}/${folders}*.ts`],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [SHARED_INTERNALS, ...layers, ...(FORBIDDEN_THREE[layer] ?? [])] },
      ],
    },
  };
}

/** The import rules of every layer, one config per layer and file depth. */
export function layerRules(): Linter.Config[] {
  const depths = Array.from({ length: MAX_DEPTH }, (_, index) => index + 1);
  return LAYERS.flatMap((layer) => {
    const forbidden = FORBIDDEN_LAYERS[layer];
    return forbidden ? depths.map((depth) => depthRules(layer, forbidden, depth)) : [];
  });
}
