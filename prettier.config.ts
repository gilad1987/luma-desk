import type { Config } from 'prettier';

// One formatting standard for every .ts, .css, .json, .md, .yml and .html file; `npm run lint` enforces it.
export default {
  printWidth: 120,
  singleQuote: true,
  semi: true,
  trailingComma: 'all',
} satisfies Config;
