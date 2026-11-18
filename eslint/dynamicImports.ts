/** An import source regex and the reason it is forbidden; `no-restricted-imports` reads this shape as a pattern. */
export interface ImportRestriction {
  readonly regex: string;
  readonly message: string;
}

/**
 * `no-restricted-imports` checks `import` and `export ... from` but not `import()`, so a dynamic import could cross a
 * layer the static rule forbids. This turns each restriction into a `no-restricted-syntax` entry on the string source
 * of `import()`, so one regex guards both forms. The selector writes the regex between slashes, so a slash in the
 * pattern is escaped.
 */
export function restrictDynamicImports(
  restrictions: readonly ImportRestriction[],
): { selector: string; message: string }[] {
  return restrictions.map(({ regex, message }) => ({
    selector: `ImportExpression[source.value=/${regex.replaceAll('/', '\\/')}/]`,
    message,
  }));
}
