import { defineConfig } from 'lint-staged/config';

// The pre-commit hook: fixes and formats only the staged files, so a commit never waits on the whole tree.
// CI still runs the full `npm run lint`; this hook only moves the common failures to commit time.
// The 100-line limit is measured after Prettier, so Prettier runs first and the line checks see the formatted file.
// Prettier runs again after ESLint, because an ESLint fix can leave code that Prettier would format differently.
export default defineConfig({
  '*.ts': ['prettier --write', 'eslint --fix --max-warnings=0', 'prettier --write'],
  // check:lines scans the whole tree and takes no file arguments
  '*.{css,scss,html,yml}': ['prettier --write', () => 'npm run check:lines'],
  '*.glsl': () => 'npm run check:lines',
  '*.{js,mjs,cjs}': () => 'npm run check:no-js',
  '*.{json,md}': 'prettier --write',
});
