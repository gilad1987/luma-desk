/** An import source regex and the reason it is forbidden; `no-restricted-imports` reads this shape as a pattern. */
export interface ImportRestriction {
  readonly regex: string;
  readonly message: string;
}

/** A path built at run time could name any layer, so a rule that reads the path cannot check it. */
const NON_LITERAL_SOURCE = {
  selector: "ImportExpression[source.type!='Literal']",
  message: 'A dynamic import needs a static path, so the layer rules can check it.',
};

/**
 * `no-restricted-imports` checks `import` and `export ... from` but not `import()`, so a dynamic import could cross a
 * layer the static rule forbids. This turns each restriction into a `no-restricted-syntax` entry on the string source
 * of `import()`, so one regex guards both forms, and it rejects a source that is not a string literal. The selector
 * writes the regex between slashes, so a slash in the pattern is escaped. The shared-folder rule (`SHARED_INTERNALS`)
 * is not mirrored on purpose: it is a glob list with exceptions that has no single regex, and it guards a folder's
 * public API, not the layer direction.
 */
export function restrictDynamicImports(
  restrictions: readonly ImportRestriction[],
): { selector: string; message: string }[] {
  const byPath = restrictions.map(({ regex, message }) => ({
    selector: `ImportExpression[source.value=/${regex.replaceAll('/', '\\/')}/]`,
    message,
  }));
  return [...byPath, NON_LITERAL_SOURCE];
}
