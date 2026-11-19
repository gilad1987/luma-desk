import type { MvrWarning } from '../MvrWarning';

/**
 * The warning for a mesh file the archive does not give. `ties` are the files the name matched equally well
 * (`MvrArchive.ties`): then none is used, because a guess could draw the wrong mesh, and the line names them.
 */
export function missingMesh(file: string, ties: readonly string[]): MvrWarning {
  if (ties.length === 0)
    return { code: 'missing-mesh', message: `The mesh file ${file} is not in the archive.`, ref: file };
  const names = ties.map((tie) => `"${tie}"`).join(', ');
  const message = `The mesh file ${file} matches ${ties.length} files in the archive (${names}); none is used.`;
  return { code: 'ambiguous-file', message, ref: file };
}
