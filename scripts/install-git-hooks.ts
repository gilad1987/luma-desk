// `npm run prepare` (npm runs it after every install): points git at the .husky/ hooks. husky is a devDependency, so an
// install without them (`npm ci --omit=dev`) skips this step instead of failing the install.
import type installHooks from 'husky';

let husky: typeof installHooks;
try {
  ({ default: husky } = await import('husky'));
} catch (error) {
  if ((error as { code?: unknown }).code !== 'ERR_MODULE_NOT_FOUND') throw error;
  console.log('prepare: husky is not installed (dev dependencies omitted); git hooks not set up');
  process.exit(0);
}
// husky reports a skipped setup (HUSKY=0, no .git) as text instead of throwing; show it
const result = husky();
if (result !== '') console.log(`prepare: ${result}`);
