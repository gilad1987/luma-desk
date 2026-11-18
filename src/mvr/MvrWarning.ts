/**
 * Why a warning was raised. A closed list, so the import summary can count and group warnings by cause instead of
 * parsing message text.
 */
export type MvrWarningCode =
  | 'multi-break'
  | 'bad-address'
  | 'missing-gdtf'
  | 'type-from-name'
  | 'bad-gdtf'
  | 'unknown-mode'
  | 'missing-symdef'
  | 'symbol-cycle'
  | 'symbol-depth'
  | 'missing-mesh'
  | 'bad-mesh'
  | 'missing-mesh-resource'
  | 'duplicate-id'
  | 'oversize'
  | 'no-geometry'
  | 'too-many-meshes'
  | 'scene-depth'
  | 'bad-matrix'
  | 'ambiguous-gdtf'
  | 'patch-overlap'
  | 'missing-screen-driver';

/**
 * A problem the importer survived. MVR files from real consoles are often partial (stub GDTFs, unpatched fixtures),
 * so the import goes on and the user reads these in the summary.
 */
export interface MvrWarning {
  readonly code: MvrWarningCode;
  /** One English sentence for the summary. */
  readonly message: string;
  /** What the warning is about: a fixture uuid, a GDTF name or a file name, so the user can find it. */
  readonly ref?: string;
}

/** Why an import failed as a whole. */
export type MvrErrorCode = 'not-zip' | 'too-large' | 'no-scene' | 'bad-xml';

/** A file the importer cannot use at all. The UI shows `message`; tests match `code`. */
export class MvrError extends Error {
  readonly code: MvrErrorCode;

  constructor(code: MvrErrorCode, message: string) {
    super(message);
    this.name = 'MvrError';
    this.code = code;
  }
}
