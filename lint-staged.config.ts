import { defineConfig } from 'lint-staged/config';

// The pre-commit hook: fixes and formats only the staged files, so a commit never waits on the whole tree.
// CI still runs the full `npm run lint`; this hook only moves the common failures to commit time.
export default defineConfig({
  '*.ts': ['eslint --fix --max-warnings=0', 'prettier --write'],
  // the 100-line limit is measured after Prettier; check:lines scans the whole tree and takes no file arguments
  '*.{css,scss}': ['prettier --write', () => 'npm run check:lines'],
  '*.glsl': () => 'npm run check:lines',
  '*.{js,mjs,cjs}': () => 'npm run check:no-js',
  '*.{json,md,yml,html}': 'prettier --write',
});
