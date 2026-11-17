import js from '@eslint/js';
import type { Linter } from 'eslint';
import prettier from 'eslint-config-prettier';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

/**
 * Files still in their pre-refactor shape: the untyped app script (`// @ts-nocheck`), far over the line limit. Each
 * phase moves code out of it. This list must be empty by Phase 6 and nothing may be added to it.
 */
const LEGACY_UNTIL_PHASE_6 = ['src/main.ts'];

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

/** Shared folders publish their API through index.ts; reaching past it couples callers to internals. */
const SHARED_INTERNALS = {
  group: ['**/shared/*', '!**/shared/index', '!**/shared/index.ts'],
  message: 'Import a shared folder through its index.ts.',
};
const THREE_ADDONS = {
  group: ['three/addons', 'three/addons/*', 'three/examples/*'],
  message: 'three/addons are render-only: domain and engine may use the three core math types alone.',
};
const THREE_CORE = { group: ['three'], message: 'core is pure helpers and imports no library.' };

/** Rules for one layer; it repeats the shared-folder rule because a later no-restricted-imports entry replaces it. */
function layerRules(layer: Layer, forbidden: readonly Layer[]): Linter.Config {
  const layers = forbidden.map((name) => ({
    group: [`**/${name}`, `**/${name}/*`],
    message: `${layer} must not import ${name}: see the layer rules in docs/plan.`,
  }));
  const three =
    layer === 'core' ? [THREE_CORE, THREE_ADDONS] : layer === 'domain' || layer === 'engine' ? [THREE_ADDONS] : [];
  return {
    files: [`src/${layer}/**/*.ts`],
    rules: { 'no-restricted-imports': ['error', { patterns: [SHARED_INTERNALS, ...layers, ...three] }] },
  };
}

export default defineConfig(
  { ignores: ['dist/', 'test-results/', 'playwright-report/', 'vendor/'] },
  {
    files: ['**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommendedTypeChecked],
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    rules: {
      'max-lines': ['error', { max: 100, skipBlankLines: false, skipComments: false }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      'no-restricted-imports': ['error', { patterns: [SHARED_INTERNALS] }],
    },
  },
  Object.entries(FORBIDDEN_LAYERS).map(([layer, forbidden]) => layerRules(layer as Layer, forbidden)),
  {
    files: LEGACY_UNTIL_PHASE_6,
    extends: [tseslint.configs.disableTypeChecked],
    // the rules the moved, unchanged code breaks today; the extraction phases fix them instead of copying them
    rules: {
      'max-lines': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      'no-empty': 'off',
      'prefer-const': 'off',
    },
  },
  prettier,
);
